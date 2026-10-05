export type AuthFormState = Readonly<{
  status: "idle" | "error" | "success";
  message: string;
}>;

export const initialAuthFormState: AuthFormState = {
  status: "idle",
  message: "",
};