// MainFile.js
import React, { useState, useEffect, useRef, useMemo } from "react";
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
// Remove Picker import
// import { Picker } from '@react-native-picker/picker';
import * as XLSX from "xlsx";
import * as ImagePicker from "expo-image-picker";
// import { Camera } from "expo-camera";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as ImageManipulator from 'expo-image-manipulator';
import BarcodeScanner from './BarcodeScanner'; // Import the BarcodeScanner component
import AsyncStorage from '@react-native-async-storage/async-storage';  // For async storage
import LogoutButton from "./Logout";

const MainFile = () => {
  // Existing state variables
  const [data, setData] = useState([]);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [loading, setLoading] = useState(false); // Loading state
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(null);
  const [scanningIndex, setScanningIndex] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const cameraRef = useRef(null);
  // New state variables for barcode editing
  const [isBarcodeModalVisible, setIsBarcodeModalVisible] = useState(false);
  const [currentEditingId, setCurrentEditingId] = useState(null); // Changed to ID
  const [newBarcodeValue, setNewBarcodeValue] = useState("");
  const [BucketName, setBucketName] = useState("");
  // New state variable for categories
  const [categories, setCategories] = useState([]);

  // New state variables for custom category modal
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [selectedCategoryItemId, setSelectedCategoryItemId] = useState(null);

  // New state variable for search
  const [searchText, setSearchText] = useState("");

  // Get device width to calculate cell width
  const deviceWidth = Dimensions.get("window").width;
  // Define number of columns based on data keys plus Image and Barcode
  const numberOfDataColumns = data[0]
    ? Object.keys(data[0]).filter(
        (key) => key !== "image" && key !== "barcode" && key !== "category" && key !== "id"
      ).length
    : 0;
  const totalColumns = numberOfDataColumns + 4; // Adding Barcode, Image, Category, and Update columns
  const cellWidth = 120; // Set a fixed width for each cell

  // Fetch categories from the API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("https://cms.vervebot.io/allcategories.json");
        const json = await response.json();
        const sortedCategories = json.Categories.sort((a, b) => a.localeCompare(b));
        setCategories(sortedCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        Alert.alert("Error", "Failed to fetch categories.");
      }
    };

    fetchCategories();
  }, []);

  /**
   * Callback function to handle the scanned barcode from BarcodeScanner
   * @param {string} scannedData - The data obtained from the scanned barcode
   */
  const handleScannedBarcode = (scannedData) => {
    if (scanningIndex !== null) {
      const updatedData = data.map(item => {
        if (item.id === scanningIndex) {
          return { ...item, barcode: scannedData };
        }
        return item;
      });
      setData(updatedData);
      setScanningIndex(null);
      setIsScanning(false);
      // Alert.alert("Barcode Scanned", `Data: ${scannedData}`);
    }
  };

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
    const folderName = await AsyncStorage.getItem('folderName');
    console.log('folderName',folderName);
    // Request Camera Permissions
    setLoading(true);
    // const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    // setHasCameraPermission(cameraStatus === "granted");

    // Request Media Library Permissions
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setHasMediaLibraryPermission(mediaStatus === "granted");

    // Fetch data from the API
    try {
      const response = await fetch(
        "https://vkw3vylvf7.execute-api.us-east-1.amazonaws.com/default/redproductslinkingapi?folderName="+folderName
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

      // Transform the API data to match the expected format and assign unique IDs
      const transformedData = apiData.data.map((item, index) => {
        // Create a new object with keys trimmed (to remove any trailing spaces)
        const trimmedItem = {};
        Object.keys(item).forEach((key) => {
          const trimmedKey = key.trim(); // Remove trailing spaces
          trimmedItem[trimmedKey] = item[key];
        });

        return {
          id: index.toString(), // Assign a unique ID as a string
          ...trimmedItem,
          image: trimmedItem.images ? trimmedItem.images : null, // Map 'images' to 'image'
          barcode: trimmedItem.barcode || null, // Initialize 'barcode' as null or existing value
          category: trimmedItem.category || "", // Initialize 'category' as null or existing value
        };
      });
      setData(transformedData);
      console.log('folderName:'+folderName);
    } catch (error) {
      console.error("Error fetching data from API:", error);
      Alert.alert("Error", `Failed to fetch data: ${error.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    const FetchData = async () => {
      const folderName = await AsyncStorage.getItem('folderName');

      console.log('folderNames',folderName);
      setBucketName(folderName);
      // Request Camera Permissions
      setLoading(true);
      // const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      // setHasCameraPermission(cameraStatus === "granted");

      // Request Media Library Permissions
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasMediaLibraryPermission(mediaStatus === "granted");

      // Fetch data from the API
      try {
        const response = await fetch(
          "https://vkw3vylvf7.execute-api.us-east-1.amazonaws.com/default/redproductslinkingapi?folderName="+folderName
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

        // Transform the API data to match the expected format and assign unique IDs
        const transformedData = apiData.data.map((item, index) => {
          // Create a new object with keys trimmed (to remove any trailing spaces)
          const trimmedItem = {};
          Object.keys(item).forEach((key) => {
            const trimmedKey = key.trim(); // Remove trailing spaces
            trimmedItem[trimmedKey] = item[key];
          });

          return {
            id: index.toString(), // Assign a unique ID as a string
            ...trimmedItem,
            image: trimmedItem.images ? trimmedItem.images : null, // Map 'images' to 'image'
            barcode: trimmedItem.barcode || null, // Initialize 'barcode' as null or existing value
            category: trimmedItem.category || "", // Initialize 'category' as null or existing value
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

  const handleImagePicker = async (id) => {
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

        const updatedData = data.map(item => {
          if (item.id === id) {
            return { ...item, image: `data:image/jpeg;base64,${compressedImage.base64}` };
          }
          return item;
        });
        setData(updatedData);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image.");
    }
  };

  // Close scanner
  const handleCloseScanner = () => {
    setIsScanning(false);
    setScanningIndex(null);
  };

  const handleBarCodeScanned = ({ type, data: barcodeData }) => {
    if (scanningIndex !== null) {
      const updatedData = data.map(item => {
        if (item.id === scanningIndex) {
          return { ...item, barcode: barcodeData };
        }
        return item;
      });
      setData(updatedData);
      setScanningIndex(null);
      setIsScanning(false);
      Alert.alert("Barcode scanned", `Data: ${barcodeData}`);
    }
  };

  // Handle picture taken from BarcodeScanner
  const handlePictureTaken = (pictureBase64) => { // Updated to receive Base64 string
    if (scanningIndex !== null) {
      const updatedData = data.map(item => {
        if (item.id === scanningIndex) {
          return { ...item, url: `data:image/jpeg;base64,${pictureBase64}` }; // Update the 'url' field with Base64 string
        }
        return item;
      });
      setData(updatedData);
      // setScanningIndex(null);
      // Alert.alert("Picture Taken", "The image has been saved to the item URL.");
    }
  };

  const handleStartScanning = (id) => {
    setScanningIndex(id);
    setIsScanning(true);
  };

  const handleDownload = async () => {
    const path = `${FileSystem.cacheDirectory}data.xlsx`;

    try {
      const dataToExport = data.map(({ image, barcode, category, ...rest }) => ({
        ...rest,
        Image: image || "",
        Barcode: barcode || "",
        Category: category || "",
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

        const updatedData = data.map(item => {
          if (item.id === scanningIndex) {
            return { ...item, image: `data:image/jpeg;base64,${compressedImage.base64}` };
          }
          return item;
        });
        setData(updatedData);

        Alert.alert("Image Captured", "The image has been saved successfully.");
      } catch (error) {
        console.error("Error taking picture:", error);
        Alert.alert("Error", "Failed to take picture.");
      }
    }
  };

  // Function to view the image from 'url' field
  const handleViewURLImage = (base64Image) => {
    setSelectedImageUri(base64Image);
    setIsImageModalVisible(true);
  };

  // Function to handle Update action
  const handleUpdate = async (item) => { // Changed to accept item instead of index

    try {
      let base64Image = "";
      if (item.image) {
        // Assuming the image is already in Base64 format
        base64Image = item.image.split(',')[1]; // Remove the data URI prefix
      }
      console.log('psotfoldername',BucketName);
      console.log('base64Image',base64Image);
      const body = {
        folderName: BucketName,
        row: (parseInt(item.id) + 1).toString(), // Assuming row starts at 1
        barcode: item.barcode || "",
        image: base64Image || "",
         category: item.category || "", // Include category in the update
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
      console.error("Error updating data make sure barcode field is not empty", error);
      Alert.alert("Error", `Failed to update data: ${error.message}`);
    }
  };

  // Function to handle opening the barcode editing modal
  const handleEditBarcode = (id) => { // Changed to accept id
    const item = data.find(d => d.id === id);
    if (item) {
      setCurrentEditingId(id);
      setNewBarcodeValue(item.barcode || "");
      setIsBarcodeModalVisible(true);
    }
  };

  // Function to handle updating the barcode after editing
  const handleBarcodeUpdate = () => {
    if (currentEditingId === null) {
      Alert.alert("Error", "No barcode selected for updating.");
      return;
    }

    // Optional: Validate the new barcode value
    if (!newBarcodeValue.trim()) {
      Alert.alert("Validation Error", "Barcode cannot be empty.");
      return;
    }

    const updatedData = data.map(item => {
      if (item.id === currentEditingId) {
        return { ...item, barcode: newBarcodeValue };
      }
      return item;
    });
    setData(updatedData);
    setIsBarcodeModalVisible(false);
    const updatedItem = updatedData.find(item => item.id === currentEditingId);
    if (updatedItem) {
      handleUpdate(updatedItem);
    }
  };

  // Filtered data based on searchText
  const filteredData = useMemo(() => {
    if (!searchText) return data;

    const lowercasedFilter = searchText.toLowerCase();
    return data.filter(item => {
      const nameMatch = item.Name?.toLowerCase().includes(lowercasedFilter);
      const barcodeMatch = item.barcode?.toLowerCase().includes(lowercasedFilter);
      return nameMatch || barcodeMatch;
    });
  }, [searchText, data]);

  // Define headers based on API response
  const apiHeaders = [
    "Name",
    "Case Cost",
    "UOM",
    "Cost",
    "Extented Price",
    "Sales Price",
    "invoice name",
    "Barcode",
    "Images",
    "Category", // Added Category header
    "Update", // Update header remains last
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

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      {apiHeaders.slice(0, -4).map((key) => ( // Adjust slice to exclude Barcode, Images, Category, Update
        <Text style={styles.cell} key={key}>
          {item[key]}
        </Text>
      ))}
      {/* Barcode Column */}
      <View style={styles.cell}>
        {item.barcode ? (
          <>
            <TouchableOpacity onPress={() => handleEditBarcode(item.id)}>
              <Text>{item.barcode}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleStartScanning(item.id)}>
              <Text style={styles.actionText}>Scan again</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={() => handleStartScanning(item.id)}>
            <Text style={styles.actionText}>Scan</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Image Column */}
      <View style={styles.cell}>
        {item.url ? (
          <>
            <TouchableOpacity onPress={() => handleViewURLImage(item.url)}>
              <Text style={styles.viewURLText}>View Image</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={() => handleImagePicker(item.id)}>
            <Text style={styles.actionText}>Add Image</Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Category Column */}
      <View style={styles.cell}>
        <TouchableOpacity
          onPress={() => {
            setSelectedCategoryItemId(item.id);
            setIsCategoryModalVisible(true);
          }}
          style={styles.categoryTouchable}
        >
          <Text style={item.category ? styles.categoryText : styles.placeholderText}>
            {item.category || "Select Category"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Update Column */}
      <View style={styles.cell}>
        <TouchableOpacity onPress={() => handleUpdate(item)}>
          <Text style={styles.actionText}>Update</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>  
      {/* Search Box */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Name or Barcode"
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      
      {/* Scrollable table */}
      <ScrollView horizontal>
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
        />
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal
        visible={isCategoryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.categoryModalContainer}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item}
              renderItem={({ item: category }) => (
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => {
                    const updatedData = data.map(d => {
                      if (d.id === selectedCategoryItemId) {
                        return { ...d, category };
                      }
                      return d;
                    });
                    setData(updatedData);
                    setIsCategoryModalVisible(false);
                    // Optionally, call handleUpdate here to update backend immediately
                    const updatedItem = updatedData.find(d => d.id === selectedCategoryItemId);
                    if (updatedItem) {
                      handleUpdate(updatedItem);
                    }
                  }}
                >
                  <Text style={styles.categoryItemText}>{category}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setIsCategoryModalVisible(false)}
            >
              <Text style={styles.closeModalText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

      {/* Scanning Modal */}
      <Modal visible={isScanning} animationType="slide">
        <BarcodeScanner onBarcodeScanned={handleScannedBarcode} onClose={handleCloseScanner} onPictureTaken={handlePictureTaken} /> {/* Render BarcodeScanner */}
        {/* Optionally, you can add a close button inside BarcodeScanner or overlay */}
        <TouchableOpacity
          style={styles.closeScannerButton}
          onPress={() => {
            setIsScanning(false);
            setScanningIndex(null);
          }}
        >
          <Text style={styles.closeModalText}>Close Scanner</Text>
        </TouchableOpacity>
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
  heading: {
    fontSize: 24,
    alignSelf: "center",
    margin: 30,
    fontWeight: "bold",
  },
  searchContainer: {
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  cell: {
    width: 120, // Fixed width for uniformity
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
  },
  headerCell: {
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
    textAlign: "center",
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
  viewURLText: {
    color: "green",
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
  closeButtonOverlay: { // Added style for close button overlay
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 5,
  },
  categoryTouchable: {
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    backgroundColor: "#f9f9f9",
  },
  categoryText: {
    color: "black",
  },
  placeholderText: {
    color: "#9EA0A4",
  },
  picker: { // Remove or keep unused
    height: 40,
    width: '100%',
    color: 'black',
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
  categoryModalContainer: {
    width: "80%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
  },
  categoryItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  categoryItemText: {
    fontSize: 16,
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
    marginTop: 10,
    alignItems: "center",
  },
  closeModalText: {
    color: "#fff",
    fontSize: 16,
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
    alignSelf: "center",
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
  closeScannerButton: {
    position: "absolute",
    bottom: 20,
    left: "50%",
    transform: [{ translateX: -50 }],
    backgroundColor: "#ff0000",
    padding: 10,
    borderRadius: 5,
  },
});

export default MainFile;
