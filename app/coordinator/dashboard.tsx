import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { Order } from "@/types/order";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
const LogoutIcon = require('@/assets/v1/logout.png');

const fetchOrders = async ({ pageParam = 1, search = "" }) => {
  const res = await api.get(`/mobile/orders/picked-orders`, {
    params: { page: pageParam, limit: 10, search },
  });

  const body = res.data;
  return body.meta
    ? body
    : {
      data: body.data,
      meta: {
        current_page: pageParam,
        last_page: 1,
      },
    };
};

export default function CoordinatorDashboard() {
  const [search, setSearch] = useState("");
  const { logout } = useAuth();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["pickedOrders", search],
    queryFn: ({ pageParam }) => fetchOrders({ pageParam, search }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.current_page < lastPage.meta.last_page
        ? lastPage.meta.current_page + 1
        : undefined,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const renderItem = ({ item }: { item: Order }) => (
    <View className="bg-white rounded-xl p-4 mb-3 shadow-sm flex-row items-center">
      <View className="bg-red-100 p-2 rounded-lg mr-3">
        <MaterialCommunityIcons name="package-variant" size={22} color="#ef4444" />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-gray-800">Order #{item.id}</Text>
        <Text className="text-red-500 text-xs">{item.tracking}</Text>
        <Text className="text-red-500 text-xs">{item.picked_by}</Text>
      </View>
      <TouchableOpacity>
        <Ionicons name="ellipsis-vertical" size={18} color="#666" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-[#F6F6F6] px-4 pt-4">
      <View className="flex-row items-center mb-4">
        <View className="flex-1 bg-white rounded-lg px-3 py-1 border border-gray-200">
          <TextInput
            placeholder="Search..."
            value={search}
            onChangeText={setSearch}
            className="text-sm"
          />
        </View>

        <TouchableOpacity
          onPress={logout}
          className="ml-2 p-2 rounded-full"
        >
          <Image
            source={LogoutIcon}
            className="w-6 h-6"
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={data?.pages.flatMap((p) => p.data) || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          onEndReached={() => hasNextPage && fetchNextPage()}
          refreshControl={
            <RefreshControl
              refreshing={isFetchingNextPage}
              onRefresh={refetch}
            />
          }
        />
      )}
      <TouchableOpacity
        onPress={() => router.push("/coordinator/assign")}
        className="absolute bottom-6 right-6 bg-red-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}
