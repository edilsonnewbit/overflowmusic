import { SafeAreaView } from "react-native";
import { HomeScreen } from "../../src/screens/HomeScreen";
import { styles } from "../../src/styles";

export default function HomeTab() {
  return (
    <SafeAreaView style={styles.root}>
      <HomeScreen />
    </SafeAreaView>
  );
}
