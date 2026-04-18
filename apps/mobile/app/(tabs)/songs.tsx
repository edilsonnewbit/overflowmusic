import { SafeAreaView, ScrollView } from "react-native";
import { SongsScreen } from "../../src/screens/SongsScreen";
import { useSession } from "../../src/context/SessionContext";
import { styles } from "../../src/styles";

export default function SongsTab() {
  const {
    user,
    songPreview,
    songImportResult,
    loadSongPreview,
    saveSongTxt,
    loadingSongPreview,
    loadingSongImport,
    activeEventId,
    handleAddToSetlist,
  } = useSession();

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <SongsScreen
          user={user}
          preview={songPreview}
          importResult={songImportResult}
          onPreview={loadSongPreview}
          onImport={saveSongTxt}
          loadingPreview={loadingSongPreview}
          loadingImport={loadingSongImport}
          activeEventId={activeEventId}
          onAddToSetlist={handleAddToSetlist}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
