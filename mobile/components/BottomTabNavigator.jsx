import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import EventListScreen from "../pages/EventListScreen";
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
            MyTickets: "ticket",
            Profile: "user",
          };
          return <Feather name={icons[route.name] ?? "circle"} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Events" component={EventListScreen} />
      <Tab.Screen
        name="MyTickets"
        component={MyTicketsScreen}
        options={{ tabBarLabel: "My Tickets" }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
