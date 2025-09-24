import { useState, useCallback } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

interface ValidationSchema {
  [key: string]: ValidationRule;
}

interface FormState {
  [key: string]: any;
}

interface FormErrors {
  [key: string]: string;
}

export const useFormValidation = <T extends FormState>(
  initialValues: T,
  validationSchema: ValidationSchema
) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const validateField = useCallback((name: string, value: any): string => {
    const rule = validationSchema[name];
    if (!rule) return '';

    if (rule.required && (!value || value.toString().trim() === '')) {
      return `${name} is required`;
    }

    if (value && rule.minLength && value.toString().length < rule.minLength) {
      return `${name} must be at least ${rule.minLength} characters`;
    }

    if (value && rule.maxLength && value.toString().length > rule.maxLength) {
      return `${name} must not exceed ${rule.maxLength} characters`;
    }

    if (value && rule.pattern && !rule.pattern.test(value.toString())) {
      return `${name} format is invalid`;
    }

    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) return customError;
    }

    return '';
  }, [validationSchema]);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(validationSchema).forEach(name => {
      const error = validateField(name, values[name as keyof T]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validateField, validationSchema]);

  const handleChange = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const handleBlur = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const error = validateField(name, values[name as keyof T]);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateForm,
    reset,
    isValid: Object.keys(errors).length === 0
  };
};