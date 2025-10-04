/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with:', { email, password });
    setIsLoading(true);
    setError('');

    try {
      console.log('Attempting login...');
      const response = await authAPI.login(email, password);
      console.log('Login successful:', response.data);
      login(response.data.token, response.data.user);
      router.push('/');
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed';
      
      // Check for staff password setting requirement
      if (error.response?.status === 202 && error.response?.data?.error?.code === 'PASSWORD_SET_REQUIRED') {
        // Redirect to set password page with user info
        const userData = error.response.data.user;
        router.push(`/set-password?email=${encodeURIComponent(userData.email)}&name=${encodeURIComponent(userData.name)}`);
        return;
      }
      
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        errorMessage = 'Cannot connect to server. Please check if the backend is running on port 5000.';
      } else if (error.response?.status === 401) {
        if (error.response?.data?.error?.code === 'ACCOUNT_INACTIVE') {
          errorMessage = 'Your account has been deactivated. Please contact admin.';
        } else {
          errorMessage = 'Invalid email or password';
        }
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg border border-gray-200">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Zargon Inventory
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {error && (
            <div className="alert-error px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary font-medium py-3 px-4 rounded-md transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
