import { Redirect } from 'expo-router';

// The center tab button pushes the creation wizard directly; this route only
// exists so the tab has a slot. Deep links land on the wizard as well.
export default function CreateTab() {
    return <Redirect href="/events/create" />;
}
