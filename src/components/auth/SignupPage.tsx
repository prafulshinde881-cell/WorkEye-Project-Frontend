// UPDATED: 2026-01-21 22:32 IST - Quick Fix with Existing Classes
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, UserPlus } from 'lucide-react';

const SignupPage = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (!agreeToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);

    try {
      const companyUsername = formData.fullName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const result = await signup({
        company_username: companyUsername,
        company_name: formData.fullName,
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName
      });

      if (result.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(result.error || 'Signup failed. Please try again.');
      }
    } catch (err: any) {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-slate-50 rounded-3xl p-8"
        style={{ boxShadow: '12px 12px 24px #d1d9e6, -12px -12px 24px #ffffff' }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div 
            className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ boxShadow: '6px 6px 12px rgba(99, 102, 241, 0.4), -3px -3px 8px rgba(255, 255, 255, 0.8)' }}
          >
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Create Account
          </h2>
          <p className="text-slate-600 text-sm">Start your free trial today</p>
        </div>

        {/* Error Message */}
        {error && (
          <div 
            className="mb-6 p-4 bg-orange-50 rounded-2xl flex items-start gap-3"
            style={{ boxShadow: '4px 4px 10px rgba(239, 68, 68, 0.2), -2px -2px 6px rgba(255, 255, 255, 0.7)' }}
          >
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-600">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Full Name / Company Name
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <User className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="John Doe or Acme Corp"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl focus:outline-none text-slate-900 placeholder-slate-400 text-sm"
                style={{ boxShadow: 'inset 5px 5px 10px #d1d9e6, inset -5px -5px 10px #ffffff' }}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Mail className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@company.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl focus:outline-none text-slate-900 placeholder-slate-400 text-sm"
                style={{ boxShadow: 'inset 5px 5px 10px #d1d9e6, inset -5px -5px 10px #ffffff' }}
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Password
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Lock className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 bg-slate-50 rounded-2xl focus:outline-none text-slate-900 placeholder-slate-400 text-sm"
                style={{ boxShadow: 'inset 5px 5px 10px #d1d9e6, inset -5px -5px 10px #ffffff' }}
                required
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />
                ) : (
                  <Eye className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Lock className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 bg-slate-50 rounded-2xl focus:outline-none text-slate-900 placeholder-slate-400 text-sm"
                style={{ boxShadow: 'inset 5px 5px 10px #d1d9e6, inset -5px -5px 10px #ffffff' }}
                required
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />
                ) : (
                  <Eye className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />
                )}
              </button>
            </div>
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-3 pt-4 pb-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              disabled={loading}
              className="w-6 h-6 rounded accent-indigo-600 cursor-pointer flex-shrink-0 mt-0.5"
              style={{
                accentColor: '#4f46e5'
              }}
            />
            <label htmlFor="terms" className="text-sm text-slate-700 cursor-pointer select-none">
              I agree to the{' '}
              <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">Privacy Policy</a>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-2xl transition-all hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            style={{ boxShadow: '6px 6px 12px rgba(99, 102, 241, 0.4), -3px -3px 8px rgba(255, 255, 255, 0.7)' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Sign In Link */}
        <p className="text-center mt-6 text-slate-600 text-sm">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
