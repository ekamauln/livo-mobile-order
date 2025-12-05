import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { Order, PaginatedResponse } from "@/types/order";
import { useFocusEffect } from "@react-navigation/native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// --- Components ---
const SkeletonItem = () => (
  <View style={[styles.card, { opacity: 0.5 }]}>
    <View
      style={{
        height: 20,
        width: "40%",
        backgroundColor: "#ddd",
        marginBottom: 8,
        borderRadius: 4,
      }}
    />
    <View
      style={{
        height: 16,
        width: "70%",
        backgroundColor: "#eee",
        borderRadius: 4,
      }}
    />
  </View>
);

// --- Fetcher ---
const fetchOrders = async ({ pageParam = 1, search = "" }) => {
  const res = await api.get(`/mobile/orders/picked-orders`, {
    params: { page: pageParam, limit: 10, search },
  });

  // Backend sometimes returns a plain ApiResponse with `data: Order[]` and no `meta`.
  // Normalize to `PaginatedResponse<Order>` so the UI and `useInfiniteQuery` work.
  const body = res.data as any;

  if (body && Array.isArray(body.data) && !body.meta) {
    return {
      data: body.data as Order[],
      meta: {
        current_page: pageParam,
        last_page: 1,
        total: (body.data as Order[]).length,
        per_page: (body.data as Order[]).length,
      },
    } as PaginatedResponse<Order>;
  }

  // If the backend already provides paginated shape, return it directly.
  return body as PaginatedResponse<Order>;
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
    getNextPageParam: (lastPage) => {
      // Defensive: ensure `meta` exists before accessing fields.
      if (
        lastPage?.meta &&
        typeof lastPage.meta.current_page === "number" &&
        typeof lastPage.meta.last_page === "number" &&
        lastPage.meta.current_page < lastPage.meta.last_page
      ) {
        return lastPage.meta.current_page + 1;
      }
      return undefined;
    },
  });

  // Refetch when page is focused
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const renderItem: ListRenderItem<Order> = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.bold}>{item.tracking}</Text>
      <Text>Assigned to: {item.picked_by || "-"}</Text>

      <Text style={[styles.metaText, { color: "green" }]}>
        {" "}
        {item.processing_status || "-"}
      </Text>
      <View style={styles.separatorHorizontal} />
      <Text style={styles.metaText}>{item.assigned_at || "-"}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.search}
          placeholder="Search..."
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          onPress={() => router.push("/coordinator/assign")}
          style={styles.assignBtn}
        >
          <Text style={styles.btnText}>Assign</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.btnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        // Show 5 skeleton items while loading
        <View>
          {[...Array(5)].map((_, i) => (
            <SkeletonItem key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={data?.pages.flatMap((page) => page.data) || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isFetchingNextPage}
              onRefresh={() => refetch()}
              colors={["#3b82f6"]}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={{ margin: 10 }} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#f5f5f5" },
  header: { flexDirection: "row", marginBottom: 15, gap: 10 },
  search: {
    flex: 1,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  card: {
    padding: 15,
    backgroundColor: "white",
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
  },
  bold: { fontWeight: "bold", fontSize: 14 },
  separatorHorizontal: {
    width: 260,
    height: 1,
    backgroundColor: "#ddd",
    marginTop: 10,
  },
  metaText: { fontSize: 11, color: "#666", marginTop: 1 },
  assignBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    padding: 8,
  },
  logoutBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    borderRadius: 8,
    padding: 8,
  },
  btnText: { color: "white", fontWeight: "bold", fontSize: 14 },
});
