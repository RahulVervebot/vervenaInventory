import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
  TextInput,
} from "react-native";
import * as XLSX from "xlsx";
import * as ImagePicker from "expo-image-picker";
import { Camera } from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as ImageManipulator from 'expo-image-manipulator';

const MainFile = () => {
  // Existing state variables
  const [data, setData] = useState([]);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [loading, setLoading] = useState(false); // Loading state

  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(null);
  const [scanningIndex, setScanningIndex] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const cameraRef = useRef(null);

  // New state variables for barcode editing
  const [isBarcodeModalVisible, setIsBarcodeModalVisible] = useState(false);
  const [currentEditingIndex, setCurrentEditingIndex] = useState(null);
  const [newBarcodeValue, setNewBarcodeValue] = useState("");

  // Get device width to calculate cell width
  const deviceWidth = Dimensions.get("window").width;
  // Define number of columns based on data keys plus Image and Barcode
  const numberOfDataColumns = data[0]
    ? Object.keys(data[0]).filter(
        (key) => key !== "image" && key !== "barcode"
      ).length
    : 0;
  const totalColumns = numberOfDataColumns + 3; // Adding Barcode, Image, and Update columns
  const cellWidth = 120; // Set a fixed width for each cell

  const compressImage = async (uri) => {
    try {
      // Resize the image to a maximum width or height of 800 pixels
      const resizedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // Check if the Base64 string exceeds 200KB
      const base64Length = resizedImage.base64.length * (3 / 4) - (resizedImage.base64.endsWith('==') ? 2 : resizedImage.base64.endsWith('=') ? 1 : 0);
      const sizeInKB = base64Length / 1024;

      if (sizeInKB > 200) {
        // If still too large, compress further
        const furtherCompressedImage = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 600 } }],
          { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        return furtherCompressedImage;
      }

      return resizedImage;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
    }
  };

  const FetchAPIData = async () => {
    // Request Camera Permissions
    setLoading(true);
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    setHasCameraPermission(cameraStatus === "granted");

    // Request Media Library Permissions
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setHasMediaLibraryPermission(mediaStatus === "granted");

    // Fetch data from the API
    try {
      const response = await fetch(
        "https://vkw3vylvf7.execute-api.us-east-1.amazonaws.com/default/redproductslinkingapi?folderName=grocerysquare"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const apiData = await response.json();
      setLoading(false);
      // Check if the response has 'data' and 'headers'
      if (!apiData.data || !apiData.headers) {
        throw new Error("Invalid API response format.");
      }

      // Transform the API data to match the expected format
      const transformedData = apiData.data.map((item) => {
        // Create a new object with keys trimmed (to remove any trailing spaces)
        const trimmedItem = {};
        Object.keys(item).forEach((key) => {
          const trimmedKey = key.trim(); // Remove trailing spaces
          trimmedItem[trimmedKey] = item[key];
        });

        return {
          ...trimmedItem,
          image: trimmedItem.images ? trimmedItem.images : null, // Map 'images' to 'image'
          barcode: trimmedItem.barcode || null, // Initialize 'barcode' as null or existing value
        };
      });

      setData(transformedData);
    } catch (error) {
      console.error("Error fetching data from API:", error);
      Alert.alert("Error", `Failed to fetch data: ${error.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    const FetchData = async () => {
      // Request Camera Permissions
      setLoading(true);
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus === "granted");

      // Request Media Library Permissions
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasMediaLibraryPermission(mediaStatus === "granted");

      // Fetch data from the API
      try {
        const response = await fetch(
          "https://vkw3vylvf7.execute-api.us-east-1.amazonaws.com/default/redproductslinkingapi?folderName=grocerysquare"
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const apiData = await response.json();
        setLoading(false);
        // Check if the response has 'data' and 'headers'
        if (!apiData.data || !apiData.headers) {
          throw new Error("Invalid API response format.");
        }

        // Transform the API data to match the expected format
        const transformedData = apiData.data.map((item) => {
          // Create a new object with keys trimmed (to remove any trailing spaces)
          const trimmedItem = {};
          Object.keys(item).forEach((key) => {
            const trimmedKey = key.trim(); // Remove trailing spaces
            trimmedItem[trimmedKey] = item[key];
          });

          return {
            ...trimmedItem,
            image: trimmedItem.images ? trimmedItem.images : null, // Map 'images' to 'image'
            barcode: trimmedItem.barcode || null, // Initialize 'barcode' as null or existing value
          };
        });

        setData(transformedData);
      } catch (error) {
        console.error("Error fetching data from API:", error);
        Alert.alert("Error", `Failed to fetch data: ${error.message}`);
        setLoading(false);
      }
    };
    FetchData();
  }, []);

  const handleImagePress = (uri) => {
    setSelectedImageUri(uri);
    setIsImageModalVisible(true);
  };

  const handleImagePicker = async (index) => {
    if (!hasMediaLibraryPermission) {
      Alert.alert("Permission required", "Please grant media library access.");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Adjust as needed
      });

      if (!result.canceled) {
        const selectedImage = result.assets[0].uri;
        const compressedImage = await compressImage(selectedImage);

        const updatedData = [...data];
        updatedData[index].image = `data:image/jpeg;base64,${compressedImage.base64}`;
        setData(updatedData);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image.");
    }
  };

  const handleBarCodeScanned = ({ type, data: barcodeData }) => {
    if (scanningIndex !== null) {
      const updatedData = [...data];
      updatedData[scanningIndex].barcode = barcodeData;
      setData(updatedData);
      setScanningIndex(null);
      setIsScanning(false);
      Alert.alert("Barcode scanned", `Data: ${barcodeData}`);
    }
  };

  const handleStartScanning = (index) => {
    setScanningIndex(index);
    setIsScanning(true);
  };

  const handleDownload = async () => {
    const path = `${FileSystem.cacheDirectory}data.xlsx`;

    try {
      const dataToExport = data.map(({ image, barcode, ...rest }) => ({
        ...rest,
        Image: image || "",
        Barcode: barcode || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      const xlsxData = XLSX.write(workbook, { type: "base64" });

      await FileSystem.writeAsStringAsync(path, xlsxData, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path);
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (err) {
      console.error("Error saving file:", err.message);
      Alert.alert("Error", `Failed to save file: ${err.message}`);
    }
  };

  // Function to capture image from camera
  const captureImage = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5, // Adjust quality as needed
          base64: false, // We'll handle Base64 conversion separately
        });

        const compressedImage = await compressImage(photo.uri);

        const updatedData = [...data];
        updatedData[scanningIndex].image = `data:image/jpeg;base64,${compressedImage.base64}`;
        setData(updatedData);

        Alert.alert("Image Captured", "The image has been saved successfully.");
      } catch (error) {
        console.error("Error taking picture:", error);
        Alert.alert("Error", "Failed to take picture.");
      }
    }
  };

  // Function to handle Update action
  const handleUpdate = async (item, index) => {
    try {
      let base64Image = "";
      if (item.image) {
        // Assuming the image is already in Base64 format
        base64Image = item.image.split(',')[1]; // Remove the data URI prefix
      }

      const body = {
        folderName: "grocerysquare",
        row: (index + 1).toString(), // Assuming row starts at 1
        barcode: item.barcode || "",
        image: base64Image || "",
      };

      const response = await fetch(
        "https://vkw3vylvf7.execute-api.us-east-1.amazonaws.com/default/redproductslinkingapi",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      Alert.alert("Success", "Data updated successfully.");
      console.log("Update response:", responseData);
    } catch (error) {
      console.error("Error updating data:", error);
      Alert.alert("Error", `Failed to update data: ${error.message}`);
    }
  };

  // Function to handle opening the barcode editing modal
  const handleEditBarcode = (index) => {
    setCurrentEditingIndex(index);
    setNewBarcodeValue(data[index].barcode || "");
    setIsBarcodeModalVisible(true);
  };

  // Function to handle updating the barcode after editing
  const handleBarcodeUpdate = () => {
    if (currentEditingIndex === null) {
      Alert.alert("Error", "No barcode selected for updating.");
      return;
    }

    // Optional: Validate the new barcode value
    if (!newBarcodeValue.trim()) {
      Alert.alert("Validation Error", "Barcode cannot be empty.");
      return;
    }

    const updatedData = [...data];
    updatedData[currentEditingIndex].barcode = newBarcodeValue;
    setData(updatedData);
    setIsBarcodeModalVisible(false);
    handleUpdate(updatedData[currentEditingIndex], currentEditingIndex);
  };

  if (hasCameraPermission === null || hasMediaLibraryPermission === null) {
    return <Text>Requesting permissions...</Text>;
  }

  if (!hasCameraPermission) {
    return <Text>No access to camera</Text>;
  }

  // Define headers based on API response
  const apiHeaders = [
    "Name",
    "Case Cost",
    "Unit of Measure",
    "Cost",
    "Extented Price",
    "Sales Price",
    "Vendor Name",
    "Invoice Number",
    "Barcode",
    "Images",
    "Update", // Added Update header
  ];

  const renderHeader = () => (
    <View style={styles.row}>
      {apiHeaders.map((header) => (
        <Text style={[styles.cell, styles.headerCell]} key={header}>
          {header}
        </Text>
      ))}
    </View>
  );

  const renderItem = ({ item, index }) => (
    <View style={styles.row}>
      {apiHeaders.slice(0, -3).map((key) => (
        <Text style={styles.cell} key={key}>
          {item[key]}
        </Text>
      ))}
      {/* Barcode Column */}
      <View style={styles.cell}>

        {item.barcode ? (
          <>
            <TouchableOpacity onPress={() => handleEditBarcode(index)}>
              <Text>{item.barcode}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleStartScanning(index)}>
              <Text style={styles.actionText}>Scan again</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={() => handleStartScanning(index)}>
            <Text style={styles.actionText}>Scan</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Image Column */}
      <View style={styles.cell}>
        {item.image ? (
          <TouchableOpacity onPress={() => handleImagePress(item.image)}>
            <Image source={{ uri: item.image }} style={styles.image} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => handleImagePicker(index)}>
            <Text style={styles.actionText}>Upload Image</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Update Column */}
      <View style={styles.cell}>
        <TouchableOpacity onPress={() => handleUpdate(item, index)}>
          <Text style={styles.actionText}>Update</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Products Linking</Text>
      {/* Scrollable table */}
      <ScrollView horizontal>
        <FlatList
          data={data}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
        />
      </ScrollView>

      {/* Barcode Editing Modal */}
      <Modal
        visible={isBarcodeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsBarcodeModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Barcode</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter new barcode"
              value={newBarcodeValue}
              onChangeText={setNewBarcodeValue}
              keyboardType="default" // Ensure it's a string input
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.updateButton}
                onPress={handleBarcodeUpdate} // Corrected handler
              >
                <Text style={styles.buttonText}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsBarcodeModalVisible(false)}
              >
                <Text style={styles.closeModalText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Existing Scanning Modal */}
      <Modal visible={isScanning} animationType="slide">
        {hasCameraPermission ? (
          <Camera
            style={{ flex: 1 }}
            ref={cameraRef}
            // type={Camera.Constants.Type.back}
            onBarCodeScanned={handleBarCodeScanned}
          >
            <View style={styles.cameraOverlay}>
              <TouchableOpacity style={styles.captureButton} onPress={captureImage}>
                <Text style={styles.buttonText}>Take Picture</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setIsScanning(false);
                  setScanningIndex(null);
                }}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Camera>
        ) : (
          <Text>No access to camera</Text>
        )}
      </Modal>

      {/* Loading Indicator */}
      {loading && <ActivityIndicator style={styles.loadingIndicator} />}

      {/* Refresh Button */}
      <Button title="Refresh" onPress={FetchAPIData} disabled={loading} />

      {/* Existing Image Modal */}
      <Modal
        visible={isImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsImageModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            {selectedImageUri && (
              <Image source={{ uri: selectedImageUri }} style={styles.fullImage} />
            )}
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setIsImageModalVisible(false)}
            >
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Define your styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    width: 120, // Fixed width for uniformity
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCell: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  },
  image: {
    width: 50,
    height: 50,
    resizeMode: "cover",
    borderRadius: 5,
  },
  actionText: {
    color: "blue",
    textDecorationLine: "underline",
    marginTop: 5,
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
  },
  captureButton: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 5,
  },
  closeButton: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 5,
  },
  buttonText: {
    color: "#000",
    fontSize: 16,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: 300,
    resizeMode: "contain",
    marginBottom: 20,
  },
  closeModalButton: {
    backgroundColor: "#2196F3",
    padding: 10,
    borderRadius: 5,
  },
  closeModalText: {
    color: "#fff",
    fontSize: 16,
  },
  heading: {
    fontSize: 24,
    alignSelf: "center",
    margin: 30,
    fontWeight: "bold",
  },
  loadingIndicator: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -25,
    marginTop: -25,
  },
  // New styles for Barcode Editing Modal
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  textInput: {
    width: "100%",
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  updateButton: {
    backgroundColor: "#28a745",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#dc3545",
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
    alignItems: "center",
  },
});

export default MainFile;