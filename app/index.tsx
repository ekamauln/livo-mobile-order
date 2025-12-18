import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { Order } from "@/types/order";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  GestureResponderEvent,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View
} from "react-native";

const LogoutIcon = require('@/assets/v1/logout.png');
const PackIcon = require('@/assets/v1/parcel.png');



export default function PickerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get("/mobile/orders");
      setOrders(res.data.data);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get("/mobile/orders");
      setOrders(res.data.data);
    } catch (error) {
      console.error("Failed to refresh orders:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Refetch when page is focused
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

  if (loading) {
    return (
      <View className="flex-1 p-4 ">
        <Text className="text-2xl font-bold mb-4 ">My Assignments</Text>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0000ff" />
          <Text className="mt-2">Loading...</Text>
        </View>
      </View>
    );
  }

  const handleLogoutpress = (e?: GestureResponderEvent) => {
    logout();
  }

  return (
    <View className="flex-1 p-5 bg-[#F6F6F6]">

      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-semibold text-gray-900">My Assignments</Text>

        <TouchableOpacity 
          onPress={logout}
          className="w-10 h-10 rounded-full justify-center items-center">
          <Image 
            source={LogoutIcon}
            className="w-6 h-6"
            resizeMode="contain"
            />
        </TouchableOpacity>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            className=" bg-white mb-3 p-4 rounded-lg shadow flex-row items-center"
            onPress={() => router.push(`/picker/order/${item.id}`)}
          >
            <View className="w-10 h-10 rounded-lg justify-center items-center">
              <Image
              source={PackIcon}
              className="w-10 h-10"
              resizeMode="contain"
              />
            </View>
            <View className="flex-1 ml-3">
            <Text className="font-bold text-lg" >Order #{item.id}</Text>
            <Text className="text-sm text-[#F2695D]">{item.tracking}</Text>
            </View>
            <TouchableOpacity className="p-2">
              <Image
              source={require('@/assets/v1/more.png')}
              className="w-5 h-5"
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2196F3"]}
          />
        }
        ListEmptyComponent={
          <View className="flex justify-center align-middle py-50">
            <Text className="text-gray-500 text-base">No orders assigned</Text>
          </View>
        }
      />
    </View>
  );
}
