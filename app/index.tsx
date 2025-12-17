import { useAuth } from "@/contexts/AuthContext";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Missing Info", "Please enter username and password");
      return;
    }
    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-[#09085a] justify-center"
      >
        <StatusBar style="light" />
        <View className="px-5 w-full">
          <View className="items-center mb-8">
            <Image
              source={require("@/assets/v1/logo.png")}
              resizeMode="contain"
              className="w-32 h-28 mb-1"
            />
            <Text className="text-white text-[28px] font-bold">
              WMSRibbon
            </Text>
            <Text className="text-white text-xs opacity-90">
              Warehouse Management System
            </Text>
          </View>
          <View className="mb-2">
            <TextInput
              className="bg-white rounded-lg px-4 py-5 text-base text-gray-800"
              placeholder="Email or Username"
              placeholderTextColor="#B0B0B0"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
          <View className="mb-2">
            <TextInput
              className="bg-white rounded-lg px-4 py-5 text-base text-gray-800"
              placeholder="Password"
              placeholderTextColor="#B0B0B0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isSubmitting}
            className={`rounded-lg py-5 items-center mt-2 ${isSubmitting ? "bg-black/70" : "bg-black"
              }`}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-lg font-bold">
                Login
              </Text>
            )}
          </TouchableOpacity>
          <View className="items-center mt-2">
            <Text className="text-white text-xs opacity-80">
              Version 1.0.2
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
