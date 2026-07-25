import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type UserType = {
  id?: string;
  name?: string;
  email: string;
};

type AuthCtx = {
  user: UserType | null;
  token: string | null;
  loading: boolean;
  login: (data: any) => void;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
});


export function AuthProvider({ children }: { children: ReactNode }) {

  const [user, setUser] = useState<UserType | null>(null);

  const [token, setToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);


  useEffect(() => {

    if (typeof window !== "undefined") {

      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");


      if(savedToken){
        setToken(savedToken);
      }


      if(savedUser){
        setUser(JSON.parse(savedUser));
      }

    }


    setLoading(false);

  }, []);


  const login = (data:any) => {

    if (typeof window !== "undefined") {

      localStorage.setItem(
        "token",
        data.token
      );


      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

    }


    setToken(data.token);
    setUser(data.user);

  };



  const logout = () => {

    if (typeof window !== "undefined") {

      localStorage.removeItem("token");
      localStorage.removeItem("user");

    }


    setToken(null);
    setUser(null);

  };



  return (
    <Ctx.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}


export const useAuth = () => useContext(Ctx);