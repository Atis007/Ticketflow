import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

function SkeletonBase({ style, className: cn }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View className={`bg-slate-700 ${cn ?? ""}`} style={[style, animatedStyle]} />;
}

export function SkeletonCard() {
  return (
    <View className="mx-4 mb-3 rounded-xl bg-slate-800 p-4">
      <SkeletonBase className="rounded-md" style={{ height: 16, width: "70%" }} />
      <SkeletonBase className="mt-2 rounded-md" style={{ height: 12, width: "50%" }} />
      <SkeletonBase className="mt-1 rounded-md" style={{ height: 12, width: "40%" }} />
      <SkeletonBase className="mt-3 rounded-md" style={{ height: 14, width: "30%" }} />
    </View>
  );
}

export function SkeletonList({ count = 5 }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

export function SkeletonText({ width = "60%", height = 14, className: cn }) {
  return <SkeletonBase className={`rounded-md ${cn ?? ""}`} style={{ height, width }} />;
}
