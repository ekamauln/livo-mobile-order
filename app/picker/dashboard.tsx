import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { Order } from "@/types/order";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
      <View style={styles.container}>
        <Text style={styles.header}>My Assignments</Text>
        <View style={styles.center}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>My Assignments</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/picker/order/${item.id}`)}
          >
            <Text style={styles.title}>Order #{item.id}</Text>
            <Text>{item.tracking}</Text>
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
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No orders assigned</Text>
          </View>
        }
      />
    </View>
  );
}
// Styles similar to previous files...
const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  header: { fontSize: 22, fontWeight: "bold" },
  logoutBtn: {
    backgroundColor: "#ef4444",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  logoutBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  card: {
    padding: 15,
    backgroundColor: "white",
    marginBottom: 10,
    borderRadius: 8,
  },
  title: { fontWeight: "bold", fontSize: 16 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
});
