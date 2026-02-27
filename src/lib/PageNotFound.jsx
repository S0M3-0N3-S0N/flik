import React from 'react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export default function PageNotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <div className="text-center space-y-6 px-4">
        <AlertTriangle className="w-16 h-16 mx-auto text-amber-500" />
        <h1 className="text-5xl font-bold text-white">404</h1>
        <p className="text-xl text-gray-400">Page not found</p>
        <p className="text-gray-500 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button
          onClick={() => navigate(createPageUrl('Editor'))}
          className="gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Button>
      </div>
    </div>
  );
}