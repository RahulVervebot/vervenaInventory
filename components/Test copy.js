import React, { useState, useRef } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function BarcodeScanner({ onBarcodeScanned }) { // Added prop
  const [permission, requestPermission] = useCameraPermissions();
  const [isBarcodeMode, setIsBarcodeMode] = useState(false);
  const cameraRef = useRef(null);
  const zoom = 0; // You can adjust the zoom level as needed (0 to 1)

  // Handle cases where camera permissions are loading
  if (!permission) {
    return <View />;
  }

  // Request camera permissions if not granted
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to access the camera.</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  /**
   * Handler function that gets called when a barcode is scanned.
   * Logs the type and data of the scanned barcode to the console.
   *
   * @param {Object} barcode - The barcode object containing type and data.
   * @param {string} barcode.type - The type of the barcode (e.g., QR, EAN13).
   * @param {string} barcode.data - The data encoded in the barcode.
   */
  const handleBarcodeScanned = ({ type, data }) => {
    console.log(`Barcode scanned! Type: ${type}, Data: ${data}`);
    if (onBarcodeScanned) {
      onBarcodeScanned(data); // Invoke the callback with scanned data
    }
    setIsBarcodeMode(false); // Optionally disable barcode mode after scanning
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        zoom={zoom}
        // Specify the types of barcodes you want to scan
        barcodeScannerSettings={{
          barcodeTypes: [
            "ean13",
            "ean8",
            "aztec",
            "upc_a",
            "datamatrix",
            "upc_e"
          ],
        }}
        // Attach the handler function if barcode mode is enabled
        onBarcodeScanned={isBarcodeMode ? handleBarcodeScanned : undefined}
      />
      
      {/* Toggle Button to Enable/Disable Barcode Scanning */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setIsBarcodeMode(prev => !prev)}
        >
          <Text style={styles.buttonText}>
            {isBarcodeMode ? "Disable Barcode Scanner" : "Enable Barcode Scanner"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Styles for the application components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    width: '80%',
  },
  button: {
    backgroundColor: '#1E90FF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
