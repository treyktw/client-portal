'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export function ValidationForm() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [placesQuery, setPlacesQuery] = useState('');

  // tRPC mutations
  const validateEmail = trpc.validation.validateEmail.useMutation();
  const validateWebsite = trpc.validation.validateWebsite.useMutation();
  const placesAutocomplete = trpc.validation.placesAutocomplete.useMutation();

  const handleEmailValidation = async () => {
    if (!email) return;
    validateEmail.mutate({ email });
  };

  const handleWebsiteValidation = async () => {
    if (!website) return;
    validateWebsite.mutate({ url: website });
  };

  const handlePlacesSearch = async () => {
    if (!placesQuery) return;
    placesAutocomplete.mutate({ query: placesQuery });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Validation</CardTitle>
          <CardDescription>Validate email addresses using tRPC</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button 
              onClick={handleEmailValidation}
              disabled={validateEmail.isPending}
            >
              {validateEmail.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validate'}
            </Button>
          </div>
          {validateEmail.data && (
            <div className="flex items-center gap-2">
              {validateEmail.data.valid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className={validateEmail.data.valid ? 'text-green-600' : 'text-red-600'}>
                {validateEmail.data.message}
              </span>
            </div>
          )}
          {validateEmail.error && (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-600">
                {validateEmail.error.message}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Website Validation</CardTitle>
          <CardDescription>Check if websites are reachable</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter website URL"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            <Button 
              onClick={handleWebsiteValidation}
              disabled={validateWebsite.isPending}
            >
              {validateWebsite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
            </Button>
          </div>
          {validateWebsite.data && (
            <div className="flex items-center gap-2">
              {validateWebsite.data.valid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className={validateWebsite.data.valid ? 'text-green-600' : 'text-red-600'}>
                {validateWebsite.data.valid ? 'Website is reachable' : validateWebsite.data.error}
              </span>
            </div>
          )}
          {validateWebsite.error && (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-600">
                {validateWebsite.error.message}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Places Autocomplete</CardTitle>
          <CardDescription>Search for places using Google Places API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter address or place"
              value={placesQuery}
              onChange={(e) => setPlacesQuery(e.target.value)}
            />
            <Button 
              onClick={handlePlacesSearch}
              disabled={placesAutocomplete.isPending}
            >
              {placesAutocomplete.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </div>
          {placesAutocomplete.data && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Found {placesAutocomplete.data.predictions.length} results:
              </p>
              {placesAutocomplete.data.predictions.map((prediction: unknown) => (
                <div key={Math.random()} className="p-2 bg-gray-50 rounded text-sm">
                  {(prediction as { description?: string }).description || 'No description'}
                </div>
              ))}
            </div>
          )}
          {placesAutocomplete.error && (
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-600">
                {placesAutocomplete.error.message}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
