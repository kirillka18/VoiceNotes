import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import HomeScreen from '../screens/HomeScreen';
import NotesScreen from '../screens/NotesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { colors, typography } from '../theme';

const Tab = createBottomTabNavigator();

interface TabIconProps {
  focused: boolean;
  icon: string;
  label: string;
  badge?: number;
}

function TabIcon({ focused, icon, label, badge }: TabIconProps) {
  return (
    <View style={styles.iconWrapper}>
      <View style={[styles.iconBg, focused && styles.iconBgActive]}>
        <Text style={[styles.iconText, focused && styles.iconTextActive]}>{icon}</Text>
        {badge != null && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.iconLabel, focused && styles.iconLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function TabNavigator() {
  const { notes, recordingState } = useApp();
  const isRecording = recordingState === 'recording';
  const insets = useSafeAreaInsets();

  const tabBarHeight = 64 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: tabBarHeight, paddingBottom: insets.bottom + 4 }],
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon={isRecording ? '◉' : '◎'}
              label="Запись"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Notes"
        component={NotesScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              icon="≡"
              label="Заметки"
              badge={notes.length > 0 ? notes.length : undefined}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="◎" label="Настройки" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.backgroundSecondary,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: 72,
  },
  iconBg: {
    width: 52,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBgActive: {
    backgroundColor: colors.primaryGlow,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 160, 0.25)',
  },
  iconText: {
    fontSize: 18,
    color: colors.textMuted,
  },
  iconTextActive: {
    color: colors.primary,
  },
  iconLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  iconLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    ...typography.caption,
    color: colors.background,
    fontSize: 9,
    fontWeight: '700',
  },
});
