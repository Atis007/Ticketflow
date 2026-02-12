import { TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function HideButton({ isRevealed, reveal }) {
  return (
    <TouchableOpacity onPress={() => reveal((prev) => !prev)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <MaterialIcons
        name={isRevealed ? "visibility" : "visibility-off"}
        size={20}
        color="#64748b"
      />
    </TouchableOpacity>
  );
}
