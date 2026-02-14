import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    interpolate,
    Extrapolate,
    runOnJS
} from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/shared/lib/supabase';
import { DEFAULT_AVATAR_PLACEHOLDER, createShadow } from '@/shared/lib/styles';
import { getOptimizedImageUrl } from '@/utils/imageOptimizer';

const { width } = Dimensions.get('window');
const MENU_WIDTH = Math.min(width * 0.75, 280);

interface SideMenuProps {
    visible: boolean;
    onClose: () => void;
    user: any; // Add proper type if available
}

export function SideMenu({ visible, onClose, user }: SideMenuProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const translateX = useSharedValue(-MENU_WIDTH);
    const opacity = useSharedValue(0);

    /* 
       Synchronize animation with "visible" prop.
       If visible = true, perform entry animation.
       If visible = false, perform exit animation.
    */
    useEffect(() => {
        if (visible) {
            translateX.value = withTiming(0, { duration: 300 });
            opacity.value = withTiming(1, { duration: 300 });
        } else {
            translateX.value = withTiming(-MENU_WIDTH, { duration: 300 });
            opacity.value = withTiming(0, { duration: 300 });
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    const backdropStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            // When opacity is 0, we want to hide it completely immediately after animation
            // But pointerEvents 'none' is handled by the parent container logic usually or View behavior
            zIndex: visible ? 999 : -1,
        };
    });

    const handleNavigation = async (path: string) => {
        if (path === 'logout') {
            await supabase.auth.signOut();
            router.replace('/auth/login');
        } else {
            router.push(path as any);
        }
        onClose();
    };



    return (
        /* Overlay Container */
        <View style={[styles.overlay, !visible && { pointerEvents: 'none' }]}>
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, backdropStyle]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
            </Animated.View>

            {/* Menu Content */}
            <Animated.View style={[styles.menuContainer, animatedStyle, { paddingTop: insets.top }]}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.userInfo}>
                        <Image
                            source={{ uri: getOptimizedImageUrl(user?.avatar_url, { width: 100 }) || DEFAULT_AVATAR_PLACEHOLDER }}
                            style={styles.avatar}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                        <View style={styles.userText}>
                            <Text style={styles.userName} numberOfLines={1}>
                                {user?.full_name || 'Usuário'}
                            </Text>
                            <Text style={styles.userRole}>
                                {user?.current_occupation || 'Membro'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <IconSymbol name="chevron.left" size={16} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Menu Items */}
                <View style={styles.menuItems}>
                    <MenuItem
                        icon="person"
                        label="Meu Perfil"
                        onPress={() => handleNavigation('/(tabs)/profile')}
                    />
                    <MenuItem
                        icon="calendar"
                        label="Meus Eventos"
                        onPress={() => handleNavigation('/profile/my-events')}
                    />
                    <MenuItem
                        icon="plus.circle"
                        label="Criar Evento"
                        onPress={() => handleNavigation('/events/create')}
                    />
                    <MenuItem
                        icon="bell"
                        label="Notificações"
                        onPress={() => handleNavigation('/notifications')} // Assuming route exists
                    />
                    <MenuItem
                        icon="gear"
                        label="Configurações"
                        onPress={() => handleNavigation('/settings')} // Assuming route exists
                    />
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <MenuItem
                        icon="rectangle.portrait.and.arrow.right"
                        label="Sair"
                        color="#FF4242"
                        onPress={() => handleNavigation('logout')}
                    />
                    <Text style={styles.version}>Wellcome v1.0.0</Text>
                </View>
            </Animated.View>
        </View>
    );
}

const MenuItem = ({ icon, label, onPress, color = '#333' }: { icon: string, label: string, onPress: () => void, color?: string }) => {
    // We can use a pressable or just touchable opacity with state for "hover" effect if needed
    // For now, simpler is using styling on the icon box
    return (
        <TouchableOpacity
            style={styles.menuItem}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconBox, { backgroundColor: color === '#FF4242' ? '#FFEEEE' : '#FFF0E0' }]}>
                <IconSymbol name={icon as any} size={20} color={color === '#333' ? '#FF8C42' : color} />
            </View>
            <Text style={[styles.menuText, { color: color === '#333' ? '#000' : color }]}>{label}</Text>
            <IconSymbol name="chevron.right" size={16} color="#FF8C42" style={{ marginLeft: 'auto', opacity: 0.5 }} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5000, // Ensure it's above everything
        elevation: 100,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    menuContainer: {
        width: MENU_WIDTH,
        height: '100%',
        backgroundColor: '#FFF',
        ...createShadow({ offsetX: 2, offsetY: 0, opacity: 0.25, radius: 4, elevation: 5 }),
        zIndex: 1000, // Ensure it is above the backdrop (zIndex 999)
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#FF8C42',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: '#EEE',
    },
    userText: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    userRole: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
    },
    closeBtn: {
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginHorizontal: 0,
        marginBottom: 20,
    },
    menuItems: {
        flex: 1,
        paddingHorizontal: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    menuText: {
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        color: '#999',
        marginTop: 10,
    }
});
