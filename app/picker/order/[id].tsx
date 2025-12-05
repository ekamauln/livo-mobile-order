import api from "@/services/api";
import { ApiResponse } from "@/types/auth";
import { Order, Product } from "@/types/order";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [targetProduct, setTargetProduct] = useState<Product | null>(null);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [quantityModalVisible, setQuantityModalVisible] = useState(false);
  const [quantityInput, setQuantityInput] = useState("");
  const [credentialModalVisible, setCredentialModalVisible] = useState(false);
  const [coordinatorUsername, setCoordinatorUsername] = useState("");
  const [coordinatorPassword, setCoordinatorPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hidden input scanner refs
  const inputRef = useRef<TextInput | null>(null);
  const inputBuffer = useRef("");
  const scannerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (id) {
      api.get<ApiResponse<Order>>(`/mobile/orders/${id}`).then((res) => {
        const orderData = res.data.data;
        // Map order_details to products if it exists
        if (orderData.order_details && !orderData.products) {
          orderData.products = orderData.order_details as unknown as Product[];
        }
        setOrder(orderData);
      });
    }
  }, [id]);

  const handleScan = (barcode: string) => {
    if (!targetProduct) return;

    const expectedBarcode = targetProduct.product?.barcode || targetProduct.sku;
    if (barcode === expectedBarcode) {
      // Close modal and show quantity prompt
      setScanModalVisible(false);
      setIsListening(false);
      if (scannerTimeout.current) {
        clearTimeout(scannerTimeout.current as any);
      }
      inputBuffer.current = "";
      inputRef.current?.clear();

      // Show quantity modal
      setQuantityInput(targetProduct.quantity.toString());
      setQuantityModalVisible(true);
    } else {
      Alert.alert(
        "Wrong Product",
        `Scanned: ${barcode}\nExpected: ${expectedBarcode}`
      );
      // Clear buffer on wrong product
      inputBuffer.current = "";
      inputRef.current?.clear();
    }
  };

  const handleQuantityInput = (productId: number, qtyString?: string) => {
    const qty = parseInt(qtyString || "0", 10);
    if (qty > 0) {
      // Update local state to show it's picked
      setOrder((prev) => {
        if (!prev || !prev.products) return prev;
        return {
          ...prev,
          products: prev.products.map((p) =>
            p.id === productId ? { ...p, picked_qty: qty } : p
          ),
        };
      });
      Alert.alert("Success", "Item updated.");
    }
  };

  // Check if all products have been picked
  const isAllPickedComplete = () => {
    if (!order || !order.products) return false;
    return order.products.every((p) => (p.picked_qty || 0) >= p.quantity);
  };

  const handleCompleteOrder = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await api.put(`/mobile/orders/${id}/complete`);
      Alert.alert("Success", "Order marked as complete!", [
        {
          text: "OK",
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to complete order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePendingOrder = async () => {
    setCredentialModalVisible(true);
  };

  const handleSubmitPending = async () => {
    if (!coordinatorUsername || !coordinatorPassword) {
      Alert.alert("Error", "Please enter username and password");
      return;
    }

    if (!id) return;

    setIsSubmitting(true);
    setCredentialModalVisible(false);

    try {
      await api.put(`/mobile/orders/${id}/pending-pick`, {
        username: coordinatorUsername,
        password: coordinatorPassword,
      });
      Alert.alert("Success", "Order marked as pending!", [
        {
          text: "OK",
          onPress: () => {
            setCoordinatorUsername("");
            setCoordinatorPassword("");
            router.back();
          },
        },
      ]);
    } catch (error: any) {
      console.error(error);
      const message =
        error.response?.data?.message || "Failed to mark as pending";
      Alert.alert("Error", message);
      setCoordinatorUsername("");
      setCoordinatorPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startScan = async (product: Product) => {
    setTargetProduct(product);
    setScanModalVisible(true);
    setIsListening(true);
    // Focus hidden input to start receiving scanner input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  if (!order)
    return (
      <View style={styles.center}>
        <Text>Loading Order...</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{order.tracking}</Text>

      <FlatList
        data={order.products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const isPicked = (item.picked_qty || 0) >= item.quantity;
          const barcode = item.product?.barcode || item.sku;
          return (
            <View style={[styles.item, isPicked && styles.pickedItem]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prodName}>
                  {item.product_name.split(" ").slice(0, 6).join(" ") + "..."}
                </Text>
                <Text style={{ color: "#666" }}>
                  Variant: {item.variant || "-"}
                </Text>
                <Text style={{ color: "#666" }}>
                  Barcode: {barcode || "N/A"}
                </Text>
                <Text>
                  Qty: {item.picked_qty || 0} / {item.quantity}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.btn,
                  isPicked ? styles.btnSuccess : styles.btnPrimary,
                ]}
                onPress={() => startScan(item)}
              >
                <Text style={{ color: "white" }}>
                  {isPicked ? "Edit" : "Scan"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <Modal
        visible={scanModalVisible}
        animationType="slide"
        onRequestClose={() => {
          setScanModalVisible(false);
          setIsListening(false);
          if (scannerTimeout.current) {
            clearTimeout(scannerTimeout.current as any);
          }
          inputBuffer.current = "";
          inputRef.current?.clear();
        }}
      >
        <View style={styles.scanContainer}>
          {targetProduct?.product?.image && (
            <Image
              source={{ uri: targetProduct.product.image }}
              style={styles.productImage}
              resizeMode="contain"
            />
          )}

          <Text style={styles.scanTitle}>
            Scanning: {targetProduct?.product_name}
          </Text>
          <Text style={styles.scanBarcode}>
            Expected Barcode:{" "}
            {targetProduct?.product?.barcode || targetProduct?.sku || "N/A"}
          </Text>

          <TouchableOpacity
            style={styles.closeScanBtn}
            onPress={() => {
              setScanModalVisible(false);
              setIsListening(false);
              if (scannerTimeout.current) {
                clearTimeout(scannerTimeout.current as any);
              }
              inputBuffer.current = "";
              inputRef.current?.clear();
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>Close</Text>
          </TouchableOpacity>

          {/* Hidden TextInput to capture barcode scanner input */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            onChangeText={(text) => {
              inputBuffer.current = text;

              if (!isListening) return;

              if (scannerTimeout.current) {
                clearTimeout(scannerTimeout.current as any);
              }
              // Auto-submit after short pause
              scannerTimeout.current = setTimeout(() => {
                const trimmed = inputBuffer.current.trim();
                if (trimmed.length > 0) {
                  handleScan(trimmed);
                  inputBuffer.current = "";
                  inputRef.current?.clear();
                }
              }, 80);
            }}
            onSubmitEditing={() => {
              if (!isListening) return;

              if (scannerTimeout.current) {
                clearTimeout(scannerTimeout.current as any);
              }
              const trimmed = inputBuffer.current.trim();
              if (trimmed.length > 0) {
                handleScan(trimmed);
                inputBuffer.current = "";
                inputRef.current?.clear();
              }
            }}
            autoFocus
            blurOnSubmit={false}
            keyboardType={
              Platform.OS === "ios" ? "default" : "visible-password"
            }
            showSoftInputOnFocus={false}
          />
        </View>
      </Modal>

      <Modal
        visible={quantityModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setQuantityModalVisible(false)}
      >
        <View style={styles.quantityOverlay}>
          <View style={styles.quantityModalContent}>
            <Text style={styles.quantityTitle}>Match Found!</Text>
            <Text style={styles.quantityLabel}>
              Enter quantity for {targetProduct?.product_name || "Product"}:
            </Text>
            <TextInput
              style={styles.quantityTextInput}
              keyboardType="number-pad"
              placeholder="Quantity"
              value={quantityInput}
              onChangeText={setQuantityInput}
              autoFocus
            />
            <View style={styles.quantityButtonsRow}>
              <TouchableOpacity
                style={styles.quantityCancelBtn}
                onPress={() => {
                  setQuantityModalVisible(false);
                  setTargetProduct(null);
                }}
              >
                <Text style={styles.quantityBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quantityConfirmBtn}
                onPress={() => {
                  if (targetProduct) {
                    handleQuantityInput(targetProduct.id, quantityInput);
                  }
                  setQuantityModalVisible(false);
                  setTargetProduct(null);
                }}
              >
                <Text style={styles.quantityBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete and Pending Buttons */}
      <View style={styles.bottomButtonsContainer}>
        <TouchableOpacity
          style={[styles.bottomBtn, styles.bottomBtnPending]}
          disabled={isSubmitting}
          onPress={handlePendingOrder}
        >
          <Text style={styles.bottomBtnText}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.bottomBtn,
            !isAllPickedComplete() && styles.bottomBtnDisabled,
          ]}
          disabled={!isAllPickedComplete() || isSubmitting}
          onPress={handleCompleteOrder}
        >
          <Text style={styles.bottomBtnText}>Complete</Text>
        </TouchableOpacity>
      </View>

      {/* Coordinator Credentials Modal */}
      <Modal
        visible={credentialModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCredentialModalVisible(false)}
      >
        <View style={styles.quantityOverlay}>
          <View style={styles.quantityModalContent}>
            <Text style={styles.quantityTitle}>Coordinator Login</Text>
            <Text style={styles.quantityLabel}>
              Enter coordinator credentials to mark as pending:
            </Text>
            <TextInput
              style={styles.quantityTextInput}
              placeholder="Username"
              value={coordinatorUsername}
              onChangeText={setCoordinatorUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.quantityTextInput}
              placeholder="Password"
              secureTextEntry
              value={coordinatorPassword}
              onChangeText={setCoordinatorPassword}
              autoCapitalize="none"
            />
            <View style={styles.quantityButtonsRow}>
              <TouchableOpacity
                style={styles.quantityCancelBtn}
                onPress={() => {
                  setCredentialModalVisible(false);
                  setCoordinatorUsername("");
                  setCoordinatorPassword("");
                }}
              >
                <Text style={styles.quantityBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quantityConfirmBtn}
                disabled={isSubmitting}
                onPress={handleSubmitPending}
              >
                <Text style={styles.quantityBtnText}>
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 15 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "white",
    marginBottom: 10,
    borderRadius: 8,
    elevation: 1,
  },
  pickedItem: {
    backgroundColor: "#e8f5e9",
    borderColor: "green",
    borderWidth: 1,
  },
  prodName: { fontWeight: "bold", fontSize: 16, marginBottom: 4 },
  btn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 6 },
  btnPrimary: { backgroundColor: "#2196F3" },
  btnSuccess: { backgroundColor: "#4CAF50" },
  scanContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  productImage: {
    width: 200,
    height: 200,
    marginBottom: 20,
    borderRadius: 8,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  scanBarcode: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  closeScanBtn: {
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  hiddenInput: {
    position: "absolute",
    left: -1000,
    width: 1,
    height: 1,
    opacity: 0,
  },
  quantityOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityModalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    elevation: 5,
  },
  quantityTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  quantityLabel: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
    color: "#333",
  },
  quantityTextInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  quantityButtonsRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  quantityCancelBtn: {
    flex: 1,
    backgroundColor: "#9ca3af",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  quantityConfirmBtn: {
    flex: 1,
    backgroundColor: "#10b981",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  quantityBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  bottomButtonsContainer: {
    flexDirection: "row",
    gap: 10,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  bottomBtn: {
    flex: 1,
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBtnDisabled: {
    backgroundColor: "#d1d5db",
  },
  bottomBtnPending: {
    backgroundColor: "#f59e0b",
  },
  bottomBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
