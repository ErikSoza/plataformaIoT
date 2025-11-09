import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            alert('Las contraseñas no coinciden');
            return;
        }

        setIsLoading(true);
        
        try {
            // Aquí iría la lógica de registro
            console.log('Register attempt:', formData);
            
            // Simulamos un registro exitoso después de 1 segundo
            setTimeout(() => {
                setIsLoading(false);
                alert('¡Registro exitoso! Redirigiendo al login...');
                navigate('/login');
            }, 1000);
        } catch (error) {
            console.error('Register error:', error);
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
                            style={styles.input}
                            placeholder="Tu nombre completo"
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#00BCD4';
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 188, 212, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#e9ecef';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label htmlFor="email" style={styles.label}>
                            Email:
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            style={styles.input}
                            placeholder="tu@email.com"
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#00BCD4';
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 188, 212, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#e9ecef';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                    </div>
                    
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
                            style={styles.input}
                            placeholder="Tu contraseña"
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#00BCD4';
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 188, 212, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#e9ecef';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                    </div>

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
                            style={styles.input}
                            placeholder="Confirma tu contraseña"
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = '#00BCD4';
                                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 188, 212, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = '#e9ecef';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        style={{
                            ...styles.submitButton,
                            opacity: isLoading ? 0.7 : 1,
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 188, 212, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {isLoading ? '🔄 Creando cuenta...' : '✨ Crear cuenta'}
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