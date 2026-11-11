import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  icon?: keyof typeof Feather.glyphMap;
  isPassword?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  icon,
  isPassword = false,
  editable = true,
  style,
  ...rest
}) => {
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: editable ? theme.surface : theme.surfaceVariant,
            borderColor: error ? theme.danger : theme.border,
          },
        ]}
      >
        {icon && (
          <Feather
            name={icon}
            size={18}
            color={error ? theme.danger : theme.textMuted}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={[
            styles.input,
            { color: editable ? theme.text : theme.textMuted },
            style,
          ]}
          placeholderTextColor={theme.textMuted}
          secureTextEntry={isPassword && !showPassword}
          editable={editable}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeBtn}
            activeOpacity={0.7}
          >
            <Feather
              name={showPassword ? 'eye-off' : 'eye'}
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  eyeBtn: {
    padding: 6,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
