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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const CompleteIcon = require('@/assets/v1/complete.png');
const PendingIcon = require('@/assets/v1/pending.png');
const CancelIcon = require('@/assets/v1/cancel.png');

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
      <View className= "flex-1 items-center justify-center">
        <Text>Loading Order...</Text>
      </View>
    );

  return (
    <View className= "flex-1 bg-[#F6F6F6] p-4">
      <Text className= " p-3 text-xl font-bold mb-4" >{order.tracking}</Text>

      <FlatList
        data={order.products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const isPicked = (item.picked_qty || 0) >= item.quantity;
          const barcode = item.product?.barcode || item.sku;
          return (
            <View className= {`p-3 flex-row items-center mb-3 shadow rounded-lg bg-white ${isPicked ?"bg-green-50 border border-green-600" : "bg-white" }`}>
              <View className= "flex-1" >
                <Text className= "font-semibold text-lg text-gray-800">
                  {item.product_name.split(" ").slice(0, 6).join(" ") + "..."}
                </Text>
                <Text className= "text-gray-700">
                  Variant: {item.variant || "-"}
                </Text>
                <Text className="text-gray-700">
                  Barcode: {barcode || "N/A"}
                </Text>
                <Text className="text-gray-700">
                  Qty: {item.picked_qty || 0} / {item.quantity}
                </Text>
              </View>
              <TouchableOpacity
                className={` mt-2 px-6 py-2 rounded-md ${isPicked ? "bg-green-500" : "bg-[#F2695D]" }`}
                onPress={() => startScan(item)}
              >
                <Text className= "text-white font-semibold">
                  {isPicked ? "Edit" : "Scan"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

{/* Match Modal */}
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
        <View className= "flex-1 items-center justify-center bg-white p-5">
          {targetProduct?.product?.image && (
            <Image
              source={{ uri: targetProduct.product.image }}
              className= "w-52 h-52 mb-5 rounded-lg"
              resizeMode="contain"
            />
          )}

          <Text className= "text-lg font-bold mb-2 text-center">
            Scanning: {targetProduct?.product_name}
          </Text>
          <Text className= "text-gray-500 mb-5 text-center">
            Expected Barcode:{" "}
            {targetProduct?.product?.barcode || targetProduct?.sku || "N/A"}
          </Text>

          <TouchableOpacity
            className= "bg-[#F2695D] px-6 py-3 rounded-lg"
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
            <Text className=  "text-white font-bold">Close</Text>
          </TouchableOpacity>

          {/* Hidden TextInput to capture barcode scanner input */}
          <TextInput
            ref={inputRef}
            className= "absolute -left-[1000px] w-1 h-1 opacity-0"
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
        <View className= "flex-1   bg-black/50 items-center justify-center">
          <View className= "bg-white rounded-xl p-5 w-4/5">
            <Text className= "text-lg font-bold mb-3 tex-center">Match Found!</Text>
            <Text className= "text-center mb-3 text-[#333] text-sm ">
              Enter quantity for {targetProduct?.product_name || "Product"}:
            </Text>
            <TextInput
              className= "border border-gray-300 rounded-lg p-3 mb-4"
              keyboardType="number-pad"
              placeholder="Quantity"
              value={quantityInput}
              onChangeText={setQuantityInput}
              autoFocus
            />
            <View className= "flex-row">
              <TouchableOpacity
                className= "flex-1 bg-[#F2695D] py-3 rounded-lg mr-1 items-center"
                onPress={() => {
                  setQuantityModalVisible(false);
                  setTargetProduct(null);
                }}
              >
                <Text className= "text-white font-bold ">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-[#000000] py-3 rounded-lg ml-1 items-center"
                onPress={() => {
                  if (targetProduct) {
                    handleQuantityInput(targetProduct.id, quantityInput);
                  }
                  setQuantityModalVisible(false);
                  setTargetProduct(null);
                }}
              >
                <Text className="text-white font-bold">Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete and Pending Buttons */}
      <View className= "flex-row p-2 bg-gray-100 border-t border-gray-300">
        <TouchableOpacity
          className= "flex-1 flex-row items-center justify-center gap-2 mx-1 px-6 py-3 rounded-lg bg-[#F2695D] disabled:opacity-50"
          disabled={isSubmitting}
          onPress={handlePendingOrder}
        >
          <Image source={PendingIcon} className="w-6 h-6" />
          <Text className= "text-white font-semibold">Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 flex-row items-center justify-center gap-2 mx-1 px-6 py-3 rounded-lg ${isAllPickedComplete() ? "bg-emerald-500" : "bg-black" }`}
          disabled={!isAllPickedComplete() || isSubmitting}
          onPress={handleCompleteOrder}
        >
          <Image source={CompleteIcon} className="w-5 h-5" />
          <Text className= "text-white font-semibold">Complete</Text>
        </TouchableOpacity>
      </View>

      {/* Coordinator Credentials Modal */}
      <Modal
        visible={credentialModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCredentialModalVisible(false)}
      >
        <View className= "flex-1 bg-black/50 items-center justify-center">
          <View className="bg-white rounded-xl p-5 w-4/5">
            <Text className= "text-lg font-bold mb-3 text-center">Coordinator Login</Text>
            <Text className= "text-base text-gray-700  mb-4 text-center">
              Enter coordinator credentials to mark as pending:
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg  p-3 mb-3"
              placeholder="Username"
              value={coordinatorUsername}
              onChangeText={setCoordinatorUsername}
              autoCapitalize="none"
            />
            <TextInput
              className= "border border-gray-300 rounded-lg p-3 mb-4"
              placeholder="Password"
              secureTextEntry
              value={coordinatorPassword}
              onChangeText={setCoordinatorPassword}
              autoCapitalize="none"
            />
            <View className= "flex-row">
              <TouchableOpacity
                className= "flex-1 bg-[#F2695D] py-3 rounded-lg mr-1 items-center"
                onPress={() => {
                  setCredentialModalVisible(false);
                  setCoordinatorUsername("");
                  setCoordinatorPassword("");
                }}
              >
                <Text className= "text-white font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className= "flex-1 bg-[#000000] py-3 rounded-lg ml-1 items-center"
                disabled={isSubmitting}
                onPress={handleSubmitPending}
              >
                <Text className= "text-white font-bold">
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
