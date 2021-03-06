import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => void;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>(); //Crio uma referência

  useEffect(() => {
    prevCartRef.current = cart; // Toda vez que renderiza esse provider ele vai pegar o cart e colocar na referencia.
  });

  const cartPreviousValue = prevCartRef.current ?? cart; // A primeira vez o cart vai tá vazio, entao a referencia vai ta null ou undefined, usamos esse operador para pegar o valor da direita caso esteja indefinido. Da segunda vez que ja tiver um valor ele pega o valor da esquerda.

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const cloneCart = [...cart];
      const productExists = cloneCart.find(
        (product) => product.id === productId
      );

      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;
      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        productExists.amount = amount;
      } else {
        const products = await api.get(`/products/${productId}`);

        const newProduct = {
          ...products.data,
          amount: 1,
        };

        cloneCart.push(newProduct);
      }

      setCart(cloneCart);
    } catch {
      return toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cloneCart = [...cart];
      const productIndex = cloneCart.findIndex(
        (product) => product.id === productId
      );

      if (productIndex >= 0) {
        cloneCart.splice(productIndex, 1); // Começo a apagar no index do produto e apago somente 1, ou seja ele.
        setCart(cloneCart);
      } else {
        throw Error(); // força o erro
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        return toast.error('Quantidade solicitada fora de estoque');
      }

      const cloneCart = [...cart];
      const productExists = cloneCart.find(
        (product) => product.id === productId
      );

      if (productExists) {
        productExists.amount = amount;
        setCart(cloneCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
