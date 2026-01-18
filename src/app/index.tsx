import { Redirect } from 'expo-router';

export default function Index() {
    // Esta rota só existe para redirecionamento inicial.
    // O RootLayout já decide para onde ir, então nunca deve ser exibida.
    return <Redirect href="/(tabs)" />;
}
