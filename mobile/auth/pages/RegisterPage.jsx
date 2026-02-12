import { View, Text, ImageBackground } from "react-native";

import AuthForm from "../components/AuthForm";

const HERO_IMAGE_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDlnENu-52-qOkmUatRw-9SHQpqEyt15dkayo_of32mnK7O01p_ETEWBROTLWXdPfk5zKsxB7lqzFc47j-XHGTaNvld57_DMHkFad11ReKwKTWo4mooMrl0L-_IOc4RGzsVJeu7EN0KiAeeynhq2FzUmJCEKCBbVDUPTno1ESfIGnksOIFJ68u1qXcgiimaRvkJvLlInsvhT_HLkD-TJqfPovuGRCQxZSZMn-153U0iv87tWgMbD-d3OSNsBuf_v3wO-4LfzOaDFUmb";

export default function RegisterPage() {
  return (
    <View className="flex-1">
        {/* Hero Section */}
        <ImageBackground
          source={{ uri: HERO_IMAGE_URL }}
          className="h-64 justify-end"
          imageStyle={{ opacity: 0.6 }}
        >
          <View className="bg-slate-900/80 p-6">
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-purple-600/20">
              <Text className="text-2xl">✨</Text>
            </View>
            <Text className="text-3xl font-bold text-white">One account.</Text>
            <Text className="text-3xl font-bold text-purple-400">
              Multiple roles.
            </Text>
            <Text className="mt-2 text-lg text-slate-300">
              Access events, organize your own, and manage everything in one place.
            </Text>
          </View>
        </ImageBackground>

        {/* Form Section */}
        <View className="flex-1 px-6 py-8 bg-slate-900/90">
          <AuthForm
            mode="register"
            headerText="Create Account"
            headerParagraph="Enter your details to access the platform."
            labelFullName="Full Name"
            placeholderFullName="e.g. Alex Sterling"
            labelEmail="Email Address"
            placeholderEmail="name@example.com"
            labelPassword="Password"
            placeholderPassword="Enter your password"
            labelPasswordAgain="Confirm Password"
            placeholderPasswordAgain="Confirm your password"
            buttonText="Get Started"
          />
        </View>
      </View>
  );
}
