import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { email } = location.state || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== rePassword) {
      alert("Passwords do not match!");
      return;
    }
    try {
      await axios.post("/api/auth/reset-password", { email, password });
      alert("Password updated successfully!");
      navigate("/login");
    } catch (error) {
      console.error(error);
      alert("Error updating password!");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl mb-4">Reset Password</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80">
        <input
          type="password"
          placeholder="New password"
          className="input input-bordered"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm password"
          className="input input-bordered"
          value={rePassword}
          onChange={(e) => setRePassword(e.target.value)}
          required
        />
        <button className="btn btn-primary" type="submit">Reset Password</button>
      </form>
    </div>
  );
};

export default ResetPassword;
