import api from "@/services/api";
import { User } from "@/types/auth";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AssignPickerScreen() {
  // scannedData: list of tracking strings
  const [scannedData, setScannedData] = useState<string[]>([]);
  // Hidden input scanner refs (captures keyboard-scanner input)
  const inputRef = useRef<TextInput | null>(null);
  const inputBuffer = useRef("");
  const scannerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isListening, setIsListening] = useState(true);

  // Picker selection
  const [pickers, setPickers] = useState<User[]>([]);
  const [loadingPickers, setLoadingPickers] = useState(false);
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [selectedPicker, setSelectedPicker] = useState<User | null>(null);
  useEffect(() => {
    let mounted = true;
    const fetchAllUsers = async () => {
      setLoadingPickers(true);
      try {
        const limit = 50;
        let page = 1;
        let collected: User[] = [];

        while (true) {
          const res = await api.get("/user-manager/users", {
            params: { page, limit, search: "" },
          });

          const data = res.data?.data;
          const users: User[] = data?.users || [];
          const pagination = data?.pagination;

          collected = collected.concat(users);

          if (!pagination || collected.length >= (pagination.total || 0)) break;
          page++;
        }

        if (!mounted) return;

        // Filter users that have role `picker`
        const pickersOnly = collected.filter(
          (u) =>
            Array.isArray(u.roles) &&
            u.roles.some((r: any) => r.name === "picker")
        );
        setPickers(pickersOnly);
      } catch (error) {
        console.error("Failed to load users:", error);
        Alert.alert("Error", "Failed to load pickers");
      } finally {
        if (mounted) setLoadingPickers(false);
      }
    };

    fetchAllUsers();
    return () => {
      mounted = false;
    };
  }, []);

  // Commit a code coming from the hidden scanner input
  const commitHidden = (code: string) => {
    const val = code.trim();
    if (!val) return;
    if (!selectedPicker) return; // ignore scans until picker selected
    if (!scannedData.includes(val)) {
      setScannedData((s) => [...s, val]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPicker) {
      Alert.alert("Select Picker", "Please select a picker before submitting.");
      return;
    }
    if (scannedData.length === 0) {
      Alert.alert("No items", "Please add at least one tracking number.");
      return;
    }

    try {
      const res = await api.post("/mobile/orders/bulk-assign-picker", {
        picker_id: selectedPicker.id,
        trackings: scannedData,
      });

      const summary = res.data?.data?.summary;
      if (summary) {
        Alert.alert(
          res.data.message || "Assignment Complete",
          `Total: ${summary.total}\nAssigned: ${summary.assigned}\nSkipped: ${summary.skipped}\nFailed: ${summary.failed}`
        );
      } else {
        Alert.alert("Success", "Orders assigned successfully");
      }

      setScannedData([]);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to assign orders");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Assign to {selectedPicker ? `${selectedPicker.username}` : "(none)"}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          style={styles.pickerBtn}
          onPress={() => setPickerModalVisible(true)}
        >
          <Text style={styles.btnText}>
            {selectedPicker?.full_name || "Select Picker"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            // Toggle listening; when pausing, clear buffer, hidden input, and scanned queue
            setIsListening((prev) => {
              const next = !prev;
              if (!next) {
                // Pausing: clear everything
                if (scannerTimeout.current) {
                  clearTimeout(scannerTimeout.current as any);
                }
                inputBuffer.current = "";
                inputRef.current?.clear();
                setScannedData([]); // Clear scanned items when pausing
              } else {
                // Resuming: ensure buffer and input are clean before focusing
                if (scannerTimeout.current) {
                  clearTimeout(scannerTimeout.current as any);
                }
                inputBuffer.current = "";
                inputRef.current?.clear();
                // refocus hidden input to receive scans
                setTimeout(() => inputRef.current?.focus(), 100);
              }
              return next;
            });
          }}
          style={[
            styles.scanStatusBtn,
            isListening ? styles.listenActive : styles.listenPaused,
          ]}
        >
          <Text style={styles.stsText}>
            {isListening ? "Active" : "Paused"}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={{ marginTop: 20 }}
        data={scannedData}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={{ fontSize: 14 }}>{item}</Text>
            <TouchableOpacity
              style={styles.rmvBtn}
              onPress={() => setScannedData((d) => d.filter((x) => x !== item))}
            >
              <Text>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        ListHeaderComponent={
          <Text style={styles.subtitle}>
            Scanned Items ({scannedData.length})
          </Text>
        }
      />

      <View style={{ marginTop: 20 }}>
        <TouchableOpacity
          style={styles.assignBtn}
          disabled={!selectedPicker || scannedData.length === 0}
          onPress={handleSubmit}
        >
          <Text style={{ color: "white", fontSize: 14, fontWeight: "bold" }}>
            Submit Assignment
          </Text>
        </TouchableOpacity>
        {/* <Button
          title="Submit Assignment"
          onPress={handleSubmit}
          disabled={!selectedPicker || scannedData.length === 0}
        /> */}
      </View>

      <Modal visible={pickerModalVisible} animationType="slide">
        <View style={{ flex: 1, padding: 16, backgroundColor: "#fff" }}>
          <Text style={{ fontSize: 16, fontWeight: "normal", marginBottom: 8 }}>
            Select Picker
          </Text>
          <TextInput
            placeholder="Search..."
            value={pickerSearch}
            onChangeText={setPickerSearch}
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              padding: 8,
              borderRadius: 8,
              marginBottom: 8,
            }}
          />

          {loadingPickers ? (
            <ActivityIndicator />
          ) : (
            <FlatList
              data={pickers.filter((p) =>
                `${p.full_name} ${p.username}`
                  .toLowerCase()
                  .includes(pickerSearch.toLowerCase())
              )}
              keyExtractor={(u) => u.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedPicker(item);
                    setPickerModalVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{item.full_name}</Text>
                  <Text style={{ color: "#666" }}>{item.username}</Text>
                </TouchableOpacity>
              )}
            />
          )}

          <View style={{ marginTop: 12 }}>
            <Button
              title="Close"
              onPress={() => setPickerModalVisible(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Hidden TextInput to capture keyboard-scanner input (like AutoID/PDT) */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        onChangeText={(text) => {
          // store incoming text regardless so we can inspect it
          inputBuffer.current = text;

          // if not listening, ignore
          if (!isListening) return;

          // if picker not selected, show a throttled alert and clear buffer
          if (!selectedPicker) {
            // Discard scanner input when no picker selected
            inputBuffer.current = "";
            inputRef.current?.clear();
            return;
          }

          if (scannerTimeout.current) {
            clearTimeout(scannerTimeout.current as any);
          }
          // Auto-submit after short pause (scanner sends characters fast)
          scannerTimeout.current = setTimeout(() => {
            const trimmed = inputBuffer.current.trim();
            if (trimmed.length > 0) {
              commitHidden(trimmed);
              inputBuffer.current = "";
              // clear native value
              inputRef.current?.clear();
            }
          }, 80);
        }}
        onSubmitEditing={() => {
          if (!isListening) return;
          if (!selectedPicker) {
            // Discard scanner input when no picker selected
            inputBuffer.current = "";
            inputRef.current?.clear();
            return;
          }

          if (scannerTimeout.current) {
            clearTimeout(scannerTimeout.current as any);
          }
          const trimmed = inputBuffer.current.trim();
          if (trimmed.length > 0) {
            commitHidden(trimmed);
            inputBuffer.current = "";
            inputRef.current?.clear();
          }
        }}
        autoFocus
        blurOnSubmit={false}
        keyboardType={Platform.OS === "ios" ? "default" : "visible-password"}
        showSoftInputOnFocus={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  subtitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  pickerBtn: {
    backgroundColor: "#2196F3",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 4,
  },
  pickerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  scanStatusBtn: {
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  listenActive: { backgroundColor: "#10b981" },
  listenPaused: { backgroundColor: "#9ca3af" },
  hiddenInput: {
    position: "absolute",
    left: -1000,
    width: 1,
    height: 1,
    opacity: 0,
  },
  btnText: { color: "white", fontSize: 12, fontWeight: "bold" },
  stsText: { color: "white", fontSize: 12, fontWeight: "bold" },
  rmvBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  assignBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
});
