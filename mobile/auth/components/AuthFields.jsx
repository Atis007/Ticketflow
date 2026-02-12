import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";

import HideButton from "./HideButton";

export default function AuthFields(props) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordRepeatVisible, setPasswordRepeatVisible] = useState(false);
  const navigation = useNavigation();

  const isRegister = props.mode === "register";
  const isLogin = props.mode === "login" || props.mode === "admin-login";

  return (
    <View className="gap-4">
      {isRegister && (
        <View className="gap-2">
          <Text className="text-sm font-medium text-slate-300">
            {props.labelFullName}
          </Text>
          <View className="flex-row h-12 items-center rounded-full border border-white/20 bg-white/5 px-4">
            <MaterialIcons name="person" size={20} color="#64748b" />
            <TextInput
              value={props.values?.fullname}
              onChangeText={(text) => props.onChangeText?.("fullname", text)}
              placeholder={props.placeholderFullName}
              placeholderTextColor="#64748b"
              autoComplete="name"
              autoCapitalize="words"
              className="flex-1 px-3 text-white"
            />
          </View>
        </View>
      )}

      <View className="gap-2">
        <Text className="text-sm font-medium text-slate-300">
          {props.labelEmail}
        </Text>
        <View className="flex-row h-12 items-center rounded-full border border-white/20 bg-white/5 px-4">
          <MaterialIcons name="mail" size={20} color="#64748b" />
          <TextInput
            value={props.values?.email}
            onChangeText={(text) => props.onChangeText?.("email", text)}
            placeholder={props.placeholderEmail}
            placeholderTextColor="#64748b"
            autoComplete="email"
            keyboardType="email-address"
            autoCapitalize="none"
            className="flex-1 px-3 text-white"
          />
        </View>
      </View>

      {props.mode !== "forgot-password" && (
        <View className="gap-2">
          <View className="flex-row justify-between">
            <Text className="text-sm text-slate-300">{props.labelPassword}</Text>
            {props.mode === "login" && (
              <TouchableOpacity
                onPress={() => navigation.navigate("ForgotPassword")}
              >
                <Text className="text-cyan-400 text-xs">Forgot Password?</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="flex-row h-12 items-center rounded-full border border-white/20 bg-white/5 px-4">
            <MaterialIcons name="lock" size={20} color="#64748b" />
            <TextInput
              value={props.values?.password}
              onChangeText={(text) => props.onChangeText?.("password", text)}
              placeholder={props.placeholderPassword}
              placeholderTextColor="#64748b"
              secureTextEntry={!passwordVisible}
              autoComplete={isRegister ? "new-password" : isLogin ? "current-password" : undefined}
              autoCapitalize="none"
              className="flex-1 px-3 text-white"
            />
            <HideButton
              isRevealed={passwordVisible}
              reveal={setPasswordVisible}
            />
          </View>
        </View>
      )}

      {isRegister && (
        <View className="gap-2">
          <Text className="text-sm font-medium text-slate-300">
            {props.labelPasswordAgain}
          </Text>
          <View className="flex-row h-12 items-center rounded-full border border-white/20 bg-white/5 px-4">
            <MaterialIcons name="lock" size={20} color="#64748b" />
            <TextInput
              value={props.values?.passwordConfirmation}
              onChangeText={(text) => props.onChangeText?.("passwordConfirmation", text)}
              placeholder={props.placeholderPasswordAgain}
              placeholderTextColor="#64748b"
              secureTextEntry={!passwordRepeatVisible}
              autoComplete="new-password"
              autoCapitalize="none"
              className="flex-1 px-3 text-white"
            />
            <HideButton
              isRevealed={passwordRepeatVisible}
              reveal={setPasswordRepeatVisible}
            />
          </View>
        </View>
      )}
    </View>
  );
}
