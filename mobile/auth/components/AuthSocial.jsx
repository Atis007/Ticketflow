import { View, Text, TouchableOpacity } from "react-native";

export default function AuthSocial() {
  const handleGooglePress = () => {
    // TODO: Implement Google Sign-In
    console.log("Google Sign-In pressed");
  };

  return (
    <View className="gap-4 mt-4">
      <View className="flex-row items-center gap-4">
        <View className="h-px flex-1 bg-white/15" />
        <Text className="text-xs text-slate-500 uppercase tracking-widest">
          Or continue with
        </Text>
        <View className="h-px flex-1 bg-white/15" />
      </View>

      <View className="items-center">
        <TouchableOpacity
          onPress={handleGooglePress}
          className="flex-row h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6"
          activeOpacity={0.7}
        >
          <Text className="text-white">Google</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
