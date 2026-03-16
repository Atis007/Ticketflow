import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import EventListScreen from "../pages/EventListScreen";
import EventSearchScreen from "../pages/EventSearchScreen";
import MyTicketsScreen from "../pages/MyTicketsScreen";
import ProfileScreen from "../pages/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0f172a",
          borderTopColor: "#1e293b",
        },
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#64748b",
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Events: "calendar",
            Search: "search",
            MyTickets: "ticket",
            Profile: "user",
          };
          return <Feather name={icons[route.name] ?? "circle"} size={size} color={color} />;
        },
      })}
      screenListeners={{
        tabPress: () => {
          Haptics.selectionAsync();
        },
      }}
    >
      <Tab.Screen name="Events" component={EventListScreen} />
      <Tab.Screen name="Search" component={EventSearchScreen} />
      <Tab.Screen
        name="MyTickets"
        component={MyTicketsScreen}
        options={{ tabBarLabel: "My Tickets" }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
