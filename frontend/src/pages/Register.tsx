import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

interface FormData {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

interface ValidationErrors {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
}

interface EmailValidation {
    isChecking: boolean;
    exists: boolean;
    message: string;
}

const Register: React.FC = () => {
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [emailValidation, setEmailValidation] = useState<EmailValidation>({
        isChecking: false,
        exists: false,
        message: ''
    });
    const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);
    const navigate = useNavigate();

    // Validación en tiempo real del email
    useEffect(() => {
        const checkEmail = async () => {
            if (!formData.email || !isValidEmail(formData.email)) {
                setEmailValidation({
                    isChecking: false,
                    exists: false,
                    message: ''
                });
                return;
            }

            setEmailValidation(prev => ({ ...prev, isChecking: true }));

            try {
                const response = await authService.checkEmailExists(formData.email);
                setEmailValidation({
                    isChecking: false,
                    exists: response.exists,
                    message: response.message
                });
                
                if (response.exists) {
                    setErrors(prev => ({ ...prev, email: 'Este email ya está registrado' }));
                } else {
                    setErrors(prev => ({ ...prev, email: undefined }));
                }
            } catch (error) {
                setEmailValidation({
                    isChecking: false,
                    exists: false,
                    message: 'Error verificando email'
                });
            }
        };

        // Debounce: solo verificar después de 800ms de que el usuario deje de escribir
        if (formData.email) {
            if (emailCheckTimeout) {
                clearTimeout(emailCheckTimeout);
            }
            
            const timeout = setTimeout(checkEmail, 800) as unknown as NodeJS.Timeout;
            setEmailCheckTimeout(timeout);
        }

        return () => {
            if (emailCheckTimeout) {
                clearTimeout(emailCheckTimeout);
            }
        };
    }, [emailCheckTimeout, formData.email]);

    // Funciones de validación
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const isValidPassword = (password: string): boolean => {
        return password.length >= 6;
    };

    const isValidName = (name: string): boolean => {
        return name.trim().length >= 2;
    };

    // Validar todo el formulario
    const validateForm = (): boolean => {
        const newErrors: ValidationErrors = {};

        // Validar nombre
        if (!formData.name.trim()) {
            newErrors.name = 'El nombre es requerido';
        } else if (!isValidName(formData.name)) {
            newErrors.name = 'El nombre debe tener al menos 2 caracteres';
        }

        // Validar email
        if (!formData.email.trim()) {
            newErrors.email = 'El email es requerido';
        } else if (!isValidEmail(formData.email)) {
            newErrors.email = 'El email no tiene un formato válido';
        } else if (emailValidation.exists) {
            newErrors.email = 'Este email ya está registrado';
        }

        // Validar contraseña
        if (!formData.password) {
            newErrors.password = 'La contraseña es requerida';
        } else if (!isValidPassword(formData.password)) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
        }

        // Validar confirmación de contraseña
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Confirma tu contraseña';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Las contraseñas no coinciden';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Limpiar error del campo cuando el usuario empieza a escribir
        if (errors[name as keyof ValidationErrors]) {
            setErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }

        // Validación en tiempo real para confirmación de contraseña
        if (name === 'confirmPassword' && formData.password) {
            if (value && value !== formData.password) {
                setErrors(prev => ({ ...prev, confirmPassword: 'Las contraseñas no coinciden' }));
            } else {
                setErrors(prev => ({ ...prev, confirmPassword: undefined }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validar formulario
        if (!validateForm()) {
            return;
        }

        // Verificar que no hay verificación de email en curso
        if (emailValidation.isChecking) {
            setErrors({ general: 'Verificando email, por favor espera...' });
            return;
        }

        setIsLoading(true);
        setErrors({});
        
        try {
            const response = await authService.register({
                nombre: formData.name.trim(),
                email: formData.email.toLowerCase().trim(),
                contrasena: formData.password,
                confirmPassword: formData.confirmPassword
            });

            // Mostrar mensaje de éxito y redirigir
            alert(`¡${response.message}! Redirigiendo al login...`);
            navigate('/login');
            
        } catch (error: any) {
            console.error('Error en registro:', error);
            
            if (error.response?.data) {
                const { message, field } = error.response.data;
                
                if (field) {
                    // Error específico de un campo
                    setErrors({ [field]: message });
                } else {
                    // Error general
                    setErrors({ general: message });
                }
            } else {
                setErrors({ 
                    general: 'Error de conexión. Verifica tu internet e intenta nuevamente.' 
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToHome = () => {
        navigate('/');
    };

    const handleGoToLogin = () => {
        navigate('/login');
    };

    return (
        <div style={styles.registerContainer}>
            <div style={styles.registerCard}>
                {/* Header con botón de volver */}
                <div style={styles.registerHeader}>
                    <button 
                        style={styles.backButton}
                        onClick={handleBackToHome}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f0f0f0';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        ← Volver al inicio
                    </button>
                </div>

                {/* Logo y título */}
                <div style={styles.logoSection}>
                    <div style={styles.logo}>📝</div>
                    <h1 style={styles.title}>Registrarse</h1>
                    <p style={styles.subtitle}>Únete a la Plataforma IoT UTalca</p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} style={styles.form}>
                    {/* Error general */}
                    {errors.general && (
                        <div style={styles.errorMessage}>
                            {errors.general}
                        </div>
                    )}

                    {/* Campo Nombre */}
                    <div style={styles.formGroup}>
                        <label htmlFor="name" style={styles.label}>
                            Nombre completo:
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            style={[
                                styles.input,
                                errors.name && styles.inputError
                            ].reduce((a, b) => ({ ...a, ...b }), {})}
                            placeholder="Tu nombre completo"
                            onFocus={(e) => {
                                if (!errors.name) {
                                    e.currentTarget.style.borderColor = '#00BCD4';
                                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 188, 212, 0.1)';
                                }
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = errors.name ? '#f44336' : '#ddd';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                        {errors.name && (
                            <span style={styles.fieldError}>{errors.name}</span>
                        )}
                    </div>

                    {/* Campo Email */}
                    <div style={styles.formGroup}>
                        <label htmlFor="email" style={styles.label}>
                            Email:
                        </label>
                        <div style={styles.inputContainer}>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                style={[
                                    styles.input,
                                    errors.email && styles.inputError
                                ].reduce((a, b) => ({ ...a, ...b }), {})}
                                placeholder="tu@email.com"
                                onFocus={(e) => {
                                    if (!errors.email) {
                                        e.currentTarget.style.borderColor = '#00BCD4';
                                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 188, 212, 0.1)';
                                    }
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = errors.email ? '#f44336' : '#ddd';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                            {/* Indicador de verificación de email */}
                            {emailValidation.isChecking && (
                                <span style={styles.emailStatus}>
                                    🔄 Verificando...
                                </span>
                            )}
                            {!emailValidation.isChecking && formData.email && !errors.email && (
                                <span style={styles.emailStatusSuccess}>
                                    ✅ Email disponible
                                </span>
                            )}
                        </div>
                        {errors.email && (
                            <span style={styles.fieldError}>{errors.email}</span>
                        )}
                    </div>

                    {/* Campo Contraseña */}
                    <div style={styles.formGroup}>
                        <label htmlFor="password" style={styles.label}>
                            Contraseña:
                        </label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            style={[
                                styles.input,
                                errors.password && styles.inputError
                            ].reduce((a, b) => ({ ...a, ...b }), {})}
                            placeholder="Mínimo 6 caracteres"
                            onFocus={(e) => {
                                if (!errors.password) {
                                    e.currentTarget.style.borderColor = '#00BCD4';
                                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 188, 212, 0.1)';
                                }
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = errors.password ? '#f44336' : '#ddd';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                        {errors.password && (
                            <span style={styles.fieldError}>{errors.password}</span>
                        )}
                    </div>

                    {/* Campo Confirmar Contraseña */}
                    <div style={styles.formGroup}>
                        <label htmlFor="confirmPassword" style={styles.label}>
                            Confirmar contraseña:
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            style={[
                                styles.input,
                                errors.confirmPassword && styles.inputError,
                                formData.confirmPassword && formData.confirmPassword === formData.password && styles.inputSuccess
                            ].reduce((a, b) => ({ ...a, ...b }), {})}
                            placeholder="Repite tu contraseña"
                            onFocus={(e) => {
                                if (!errors.confirmPassword) {
                                    e.currentTarget.style.borderColor = '#00BCD4';
                                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 188, 212, 0.1)';
                                }
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = errors.confirmPassword ? '#f44336' : '#ddd';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                        {errors.confirmPassword && (
                            <span style={styles.fieldError}>{errors.confirmPassword}</span>
                        )}
                        {!errors.confirmPassword && formData.confirmPassword && formData.confirmPassword === formData.password && (
                            <span style={styles.fieldSuccess}>✅ Las contraseñas coinciden</span>
                        )}
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isLoading || emailValidation.isChecking}
                        style={{
                            ...styles.submitButton,
                            opacity: (isLoading || emailValidation.isChecking) ? 0.7 : 1,
                            cursor: (isLoading || emailValidation.isChecking) ? 'not-allowed' : 'pointer'
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading && !emailValidation.isChecking) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 188, 212, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {isLoading ? '🔄 Creando cuenta...' : 
                         emailValidation.isChecking ? '⏳ Verificando...' : 
                         '✨ Crear cuenta'}
                    </button>
                </form>

                {/* Enlaces adicionales */}
                <div style={styles.linksSection}>
                    <p style={styles.linkText}>
                        ¿Ya tienes cuenta? 
                        <span 
                            style={styles.link}
                            onClick={handleGoToLogin}
                        >
                            {' '}Inicia sesión aquí
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
};

const styles = {
    registerContainer: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #00BCD4 0%, #00ACC1 50%, #0097A7 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
    },

    registerCard: {
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '450px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
        position: 'relative' as const,
    },

    registerHeader: {
        marginBottom: '20px',
    },

    backButton: {
        background: 'transparent',
        border: 'none',
        color: '#666',
        cursor: 'pointer',
        fontSize: '14px',
        padding: '8px 12px',
        borderRadius: '6px',
        transition: 'all 0.3s ease',
    },

    logoSection: {
        textAlign: 'center' as const,
        marginBottom: '30px',
    },

    logo: {
        fontSize: '3rem',
        marginBottom: '16px',
    },

    title: {
        color: '#2c3e50',
        fontSize: '2rem',
        fontWeight: '600' as const,
        margin: '0 0 8px 0',
    },

    subtitle: {
        color: '#7f8c8d',
        fontSize: '1rem',
        margin: '0',
        fontWeight: '300' as const,
    },

    form: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '20px',
    },

    formGroup: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
    },

    label: {
        color: '#2c3e50',
        fontSize: '14px',
        fontWeight: '500' as const,
    },

    input: {
        padding: '14px 16px',
        border: '2px solid #e9ecef',
        borderRadius: '8px',
        fontSize: '16px',
        transition: 'all 0.3s ease',
        outline: 'none',
    },

    inputContainer: {
        position: 'relative' as const,
    },

    inputError: {
        borderColor: '#f44336',
        backgroundColor: '#fef7f7',
    },

    inputSuccess: {
        borderColor: '#4caf50',
        backgroundColor: '#f7fef7',
    },

    errorMessage: {
        backgroundColor: '#fef7f7',
        color: '#f44336',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid #f44336',
        fontSize: '14px',
        textAlign: 'center' as const,
        marginBottom: '10px',
    },

    fieldError: {
        color: '#f44336',
        fontSize: '12px',
        marginTop: '4px',
        fontWeight: '500' as const,
    },

    fieldSuccess: {
        color: '#4caf50',
        fontSize: '12px',
        marginTop: '4px',
        fontWeight: '500' as const,
    },

    emailStatus: {
        position: 'absolute' as const,
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '12px',
        color: '#ff9800',
        fontWeight: '500' as const,
    },

    emailStatusSuccess: {
        position: 'absolute' as const,
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '12px',
        color: '#4caf50',
        fontWeight: '500' as const,
    },

    submitButton: {
        background: 'linear-gradient(135deg, #00BCD4 0%, #0097A7 100%)',
        color: 'white',
        border: 'none',
        padding: '16px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600' as const,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        marginTop: '10px',
    },

    linksSection: {
        textAlign: 'center' as const,
        marginTop: '30px',
        borderTop: '1px solid #e9ecef',
        paddingTop: '20px',
    },

    linkText: {
        color: '#7f8c8d',
        fontSize: '14px',
        margin: '8px 0',
    },

    link: {
        color: '#00BCD4',
        cursor: 'pointer',
        fontWeight: '500' as const,
    },
};

export default Register;