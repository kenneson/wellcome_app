import type { ReactNode } from "react";
import type {
  ImageSourcePropType,
  ViewStyle,
  ImageStyle,
  TextStyle,
  StyleProp,
} from "react-native";

interface CardTitleProps {
  children: ReactNode;
  style?: TextStyle;
}

interface CardStatusProps {
  children: ReactNode;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface CardImageProps {
  source: ImageSourcePropType;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  imageStyle?: ImageStyle;
}

interface CardUserInfoProps {
  avatar: ImageSourcePropType;
  username: string;
  timestamp: string;
  style?: StyleProp<ViewStyle>;
}

interface CardActionProps {
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
}

interface CardFooterProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export {
  CardProps,
  CardTitleProps,
  CardStatusProps,
  CardImageProps,
  CardUserInfoProps,
  CardActionProps,
  CardFooterProps,
};
