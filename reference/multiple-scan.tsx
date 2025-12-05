import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ScannedBarcode {
  id: string;
  code: string;
  timestamp: Date;
}

export default function BarcodeScannerApp() {
  const [scannedBarcodes, setScannedBarcodes] = useState<ScannedBarcode[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [isListening, setIsListening] = useState(true);

  // We'll use a hidden TextInput to capture keyboard-scanner input
  const inputRef = useRef<TextInput | null>(null);
  const inputBuffer = useRef("");
  const scannerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Auto-focus on mount (user may need to tap depending on platform)
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);

    return () => clearTimeout(t);
  }, []);

  // Called when text changes in the hidden TextInput
  const onChangeText = (text: string) => {
    if (!isListening) return;

    // Many scanners append a newline/Enter; we'll trim final newline on submit
    inputBuffer.current = text;
    setCurrentInput(text);

    if (scannerTimeout.current) {
      clearTimeout(scannerTimeout.current as any);
    }

    // Auto-submit after short pause (50-100ms)
    scannerTimeout.current = setTimeout(() => {
      const trimmed = inputBuffer.current.trim();
      if (trimmed.length > 0) {
        const newBarcode: ScannedBarcode = {
          id: `${Date.now()}-${Math.random()}`,
          code: trimmed,
          timestamp: new Date(),
        };

        setScannedBarcodes((prev) => [newBarcode, ...prev]);
        inputBuffer.current = "";
        setCurrentInput("");
        // Clear the TextInput value by forcing focus and clearing native text
        inputRef.current?.clear();
      }
    }, 80);
  };

  // Handles Enter key (some scanners send it)
  const onSubmitEditing = () => {
    if (!isListening) return;
    if (scannerTimeout.current) {
      clearTimeout(scannerTimeout.current as any);
    }

    const trimmed = inputBuffer.current.trim();
    if (trimmed.length > 0) {
      const newBarcode: ScannedBarcode = {
        id: `${Date.now()}-${Math.random()}`,
        code: trimmed,
        timestamp: new Date(),
      };

      setScannedBarcodes((prev) => [newBarcode, ...prev]);
      inputBuffer.current = "";
      setCurrentInput("");
      inputRef.current?.clear();
    }
  };

  const clearAll = () => setScannedBarcodes([]);

  const deleteBarcode = (id: string) =>
    setScannedBarcodes((prev) => prev.filter((b) => b.id !== id));

  const exportToCSV = async () => {
    if (scannedBarcodes.length === 0) {
      Alert.alert("No data", "There are no scanned barcodes to export.");
      return;
    }

    const csv = [
      ["Barcode", "Timestamp"],
      ...scannedBarcodes.map((b) => [b.code, b.timestamp.toLocaleString()]),
    ]
      .map((row) => row.map((cell) => `${cell}`).join(","))
      .join("\n");

    try {
      await Share.share({
        title: `barcodes_${Date.now()}.csv`,
        message: csv,
      });
    } catch (err) {
      Alert.alert("Export failed", String(err));
    }
  };

  const toggleListening = () => {
    setIsListening((prev) => !prev);
    if (isListening) {
      inputBuffer.current = "";
      setCurrentInput("");
      inputRef.current?.clear();
    }
    // Refocus the hidden input so scans still go to it
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const renderItem = ({ item }: { item: ScannedBarcode }) => (
    <View style={styles.itemRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.codeText}>{item.code}</Text>
        <Text style={styles.tsText}>{item.timestamp.toLocaleString()}</Text>
      </View>
      <TouchableOpacity
        onPress={() => deleteBarcode(item.id)}
        style={styles.deleteBtn}
      >
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Barcode Scanner</Text>
          <TouchableOpacity
            onPress={toggleListening}
            style={[
              styles.listenBtn,
              isListening ? styles.listenActive : styles.listenPaused,
            ]}
          >
            <Text style={styles.listenBtnText}>
              {isListening ? "Scanning Active" : "Scanning Paused"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.currentBox}>
          <Text style={styles.small}>Current Input:</Text>
          <Text style={styles.mono}>
            {currentInput || (
              <Text style={styles.placeholder}>Waiting for scan...</Text>
            )}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.statsRow}>
          <View>
            <Text style={styles.small}>Total Scanned</Text>
            <Text style={styles.total}>{scannedBarcodes.length}</Text>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={exportToCSV}
              style={[
                styles.actionBtn,
                scannedBarcodes.length === 0 && styles.disabledBtn,
              ]}
              disabled={scannedBarcodes.length === 0}
            >
              <Text style={styles.actionText}>Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={clearAll}
              style={[
                styles.actionBtn,
                scannedBarcodes.length === 0 && styles.disabledBtn,
              ]}
              disabled={scannedBarcodes.length === 0}
            >
              <Text style={styles.actionText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.card, { flex: 1 }]}>
        <Text style={styles.sectionTitle}>Scanned Barcodes</Text>

        {scannedBarcodes.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No barcodes scanned yet</Text>
            <Text style={styles.emptySub}>Start scanning with your device</Text>
          </View>
        ) : (
          <FlatList
            data={scannedBarcodes}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
          />
        )}
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instTitle}>Instructions:</Text>
        <Text style={styles.instText}>
          • Ensure scanning is active • Point your scanner at barcodes to scan •
          Barcodes will appear in the list • Use Export to share CSV text
        </Text>
      </View>

      {/* Hidden TextInput to capture keyboard input from barcode scanners */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={currentInput}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        autoFocus
        blurOnSubmit={false}
        keyboardType={Platform.OS === "ios" ? "default" : "visible-password"}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eef2ff", padding: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#111827" },
  listenBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  listenActive: { backgroundColor: "#10b981" },
  listenPaused: { backgroundColor: "#9ca3af" },
  listenBtnText: { color: "#fff", fontWeight: "600" },
  currentBox: {
    marginTop: 12,
    borderRadius: 8,
    padding: 10,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
  small: { color: "#6b7280", fontSize: 12 },
  mono: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 16,
    color: "#111827",
    marginTop: 6,
    minHeight: 24,
  },
  placeholder: { color: "#9ca3af" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  total: { fontSize: 28, fontWeight: "800", color: "#6366f1" },
  actionsRow: { flexDirection: "row" },
  actionBtn: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  actionText: { color: "#fff", fontWeight: "600" },
  disabledBtn: { opacity: 0.5, backgroundColor: "#94a3b8" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyTitle: { color: "#9ca3af", fontSize: 16 },
  emptySub: { color: "#cbd5e1", marginTop: 6 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  codeText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 16,
    color: "#111827",
  },
  tsText: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  deleteBtn: { padding: 8, backgroundColor: "#fff1f2", borderRadius: 6 },
  deleteText: { color: "#dc2626", fontWeight: "600" },
  instructions: { padding: 10 },
  instTitle: { fontWeight: "700", color: "#0f172a" },
  instText: { color: "#0f172a", marginTop: 6, lineHeight: 18 },
  hiddenInput: {
    position: "absolute",
    left: -1000,
    width: 1,
    height: 1,
    opacity: 0,
  },
});
