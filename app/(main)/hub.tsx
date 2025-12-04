import { Button, Card } from '@rneui/themed';
import { Text, View } from 'react-native';

export default function Hub() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Card>
        <Card.Title>Welcome to the Hub</Card.Title>
        <Card.Divider />
        <Text style={{ marginBottom: 12 }}>
          This will be the main dashboard for Autopack Summit.
        </Text>
        <Button title='Placeholder Action' />
      </Card>
    </View>
  );
}
