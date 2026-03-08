import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LoginErrors {
    email?: string;
    password?: string;
    general?: string;
}

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<LoginErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { login, isAuthenticated, isLoading: authLoading } = useAuth();

    // Rediriger si ya está autenticado
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, authLoading, navigate]);

    // Validaciones
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateForm = (): boolean => {
        const newErrors: LoginErrors = {};

        // Validar email
        if (!email.trim()) {
            newErrors.email = 'El email es requerido';
        } else if (!isValidEmail(email)) {
            newErrors.email = 'El email no tiene un formato válido';
        }

        // Validar contraseña
        if (!password) {
            newErrors.password = 'La contraseña es requerida';
        } else if (password.length < 6) {
            newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validar formulario
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setErrors({});
        
        try {
            await login(email.toLowerCase().trim(), password);
            
            // El useEffect se encargará de la redirección
            console.log('✅ Login exitoso, redirigiendo...');
            
        } catch (error: any) {
            console.error('❌ Error en login:', error);
            
            if (error.response?.data) {
                const { message } = error.response.data;
                
                // Manejar errores específicos
                if (message.toLowerCase().includes('credenciales')) {
                    setErrors({ 
                        general: 'Email o contraseña incorrectos. Verifica tus datos.' 
                    });
                } else {
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

    const handleInputChange = (field: 'email' | 'password', value: string) => {
        if (field === 'email') {
            setEmail(value);
        } else {
            setPassword(value);
        }

        // Limpiar errores cuando el usuario empiece a escribir
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: undefined,
                general: undefined // También limpiar error general
            }));
        }
    };

    const handleBackToHome = () => {
        navigate('/');
    };

    return (
        <div style={styles.loginContainer}>
            <div style={styles.loginCard}>
                {/* Header con botón de volver */}
                <div style={styles.loginHeader}>
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
                    <div style={styles.logo}>🌐</div>
                    <h1 style={styles.title}>Iniciar Sesión</h1>
                    <p style={styles.subtitle}>Accede a la Plataforma IoT UTalca</p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} style={styles.form}>
                    {/* Error general */}
                    {errors.general && (
                        <div style={styles.errorMessage}>
                            {errors.general}
                        </div>
                    )}

                    <div style={styles.formGroup}>
                        <label htmlFor="email" style={styles.label}>
                            Email:
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
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
                                e.currentTarget.style.borderColor = errors.email ? '#f44336' : '#e9ecef';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                        {errors.email && (
                            <span style={styles.fieldError}>{errors.email}</span>
                        )}
                    </div>
                    
                    <div style={styles.formGroup}>
                        <label htmlFor="password" style={styles.label}>
                            Contraseña:
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            required
                            style={[
                                styles.input,
                                errors.password && styles.inputError
                            ].reduce((a, b) => ({ ...a, ...b }), {})}
                            placeholder="Tu contraseña"
                            onFocus={(e) => {
                                if (!errors.password) {
                                    e.currentTarget.style.borderColor = '#00BCD4';
                                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 188, 212, 0.1)';
                                }
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = errors.password ? '#f44336' : '#e9ecef';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                        {errors.password && (
                            <span style={styles.fieldError}>{errors.password}</span>
                        )}
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isLoading || authLoading}
                        style={{
                            ...styles.submitButton,
                            opacity: (isLoading || authLoading) ? 0.7 : 1,
                            cursor: (isLoading || authLoading) ? 'not-allowed' : 'pointer'
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading && !authLoading) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 188, 212, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {isLoading ? '🔄 Iniciando sesión...' : 
                         authLoading ? '⏳ Cargando...' : 
                         '🚀 Iniciar Sesión'}
                    </button>
                </form>

                {/* Enlaces adicionales */}
                <div style={styles.linksSection}>
                    <p style={styles.linkText}>
                        ¿No tienes cuenta? 
                        <span 
                            style={styles.link}
                            onClick={() => navigate('/register')}
                        >
                            {' '}Regístrate aquí
                        </span>
                    </p>
                    <p style={styles.linkText}>
                        <span style={styles.link}>¿Olvidaste tu contraseña?</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

const styles = {
    loginContainer: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #00BCD4 0%, #00ACC1 50%, #0097A7 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
    },

    loginCard: {
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '450px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
        position: 'relative' as const,
    },

    loginHeader: {
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

    inputError: {
        borderColor: '#f44336',
        backgroundColor: '#fef7f7',
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

export default Login;