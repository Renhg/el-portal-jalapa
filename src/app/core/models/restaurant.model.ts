
export interface Restaurant {
  id: number;
  name: string;
  description: string;
  category: string;
  rating?: number;
  deliveryTime: string;
  image: string;
  imageUrl: string | null;
}
