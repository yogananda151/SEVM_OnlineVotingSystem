import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Vote, Eye, EyeOff, Shield, UserCog, Monitor } from 'lucide-react';
import { authService } from '../../services/auth.service';
import { Spinner } from '../../components/ui';
import { toast } from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

type Role = 'COMMISSIONER' | 'OFFICER';

const roleConfig = {
  COMMISSIONER: {
    label: 'Election Commissioner',
    color: 'from-blue-600 to-blue-800',
    accent: 'text-blue-400',
    icon: Shield,
    route: '/admin',
    defaultEmail: 'commissioner@evm.gov.in',
  },
  OFFICER: {
    label: 'Election Officer',
    color: 'from-emerald-600 to-emerald-800',
    accent: 'text-emerald-400',
    icon: UserCog,
    route: '/officer',
    defaultEmail: 'officer1@evm.gov.in',
  },
};

export const LoginPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<Role>('COMMISSIONER');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const config = roleConfig[selectedRole];

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const result = await authService.login(data);
      if (result.user.role !== selectedRole) {
        toast.error(`This account is not an ${config.label}.`);
        authService.logout();
        return;
      }
      toast.success(`Welcome back!`);
      navigate(config.route);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex w-16 h-16 rounded-2xl bg-primary-600 items-center justify-center mb-4 shadow-2xl shadow-primary-900/50"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, repeatDelay: 5, duration: 0.5 }}
          >
            <Vote size={28} className="text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white">Smart EVM</h1>
          <p className="text-slate-400 mt-1 text-sm">Electronic Voting Management System</p>
          <p className="text-slate-500 text-xs mt-1">Election Commission of India – Official Portal</p>
        </div>

        {/* Role Selector */}
        <div className="card p-1.5 flex gap-1.5 mb-6">
          {(Object.entries(roleConfig) as [Role, typeof roleConfig[Role]][]).map(([role, cfg]) => (
            <button
              key={role}
              onClick={() => { setSelectedRole(role); setValue('email', ''); setValue('password', ''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                selectedRole === role
                  ? `bg-gradient-to-r ${cfg.color} text-white shadow-lg`
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <cfg.icon size={16} />
              <span className="hidden sm:block">{cfg.label}</span>
            </button>
          ))}
        </div>

        {/* Login Form */}
        <motion.div
          key={selectedRole}
          className="card p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center`}>
              <config.icon size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{config.label} Login</h2>
              <p className="text-xs text-slate-400">Secure official access</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input
                {...register('email')}
                type="email"
                placeholder="official@evm.gov.in"
                className={`input ${errors.email ? 'input-error' : ''}`}
                autoComplete="username"
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`input pr-12 ${errors.password ? 'input-error' : ''}`}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className={`w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${config.color} hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60`}>
              {loading ? <><Spinner size={16} /> Authenticating...</> : 'Sign In Securely'}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-4 p-3 rounded-xl bg-slate-700/30 border border-slate-600/30">
            <p className="text-xs text-slate-500 font-medium mb-1">Demo Credentials</p>
            <button type="button" onClick={() => { setValue('email', config.defaultEmail); setValue('password', selectedRole === 'COMMISSIONER' ? 'Admin@12345' : 'Officer@12345'); }}
              className={`text-xs ${config.accent} hover:underline`}>
              Fill: {config.defaultEmail}
            </button>
          </div>
        </motion.div>

        {/* Voting Machine Link */}
        <div className="mt-4 text-center">
          <Link to="/voting-machine"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            <Monitor size={14} />
            Open Touchscreen Voting Machine →
          </Link>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © 2025 Election Commission of India. Official System – Educational Simulation.
        </p>
      </motion.div>
    </div>
  );
};
