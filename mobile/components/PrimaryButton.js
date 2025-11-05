import React from 'react';
import { Button } from 'react-native-paper';

export default function PrimaryButton({ children, ...props }) {
  return (
    <Button mode="contained" uppercase={false} style={{borderRadius:8}} {...props}>
      {children}
    </Button>
  );
}
