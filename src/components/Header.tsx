import React from 'react';
import { Text } from 'react-native';

type HeaderProps = {
  title: string;
};

const Header = ({ title }: HeaderProps) => {
  return (
    <Text
      style={{
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 20,
      }}>
      {title}
    </Text>
  );
};

export default Header;