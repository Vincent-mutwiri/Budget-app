import React, { useState } from 'react';
import { X, Smartphone, Mail, Shield, Copy, Check } from 'lucide-react';

interface MFASetupProps {
    userId: string;
    onComplete: () => void;
    onCancel: () => void;
}

type SetupStep = 'method' | 'setup' | 'verify' | 'backup';

export const MFASetup: React.FC<MFASetupProps> = ({ userId, onComplete, onCancel }) => {
    const [step, setStep] = useState<SetupStep>('method');
    const [method, setMethod] = useState<'app' | 'email'>('app');
    const [secret, setSecret] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiedCodes, setCopiedCodes] = useState(false);

    const handleMethodSelect = async (selectedMethod: 'app' | 'email') => {
        setMethod(selectedMethod);
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/security/mfa/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, method: selectedMethod })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to setup MFA');
            }

            if (selectedMethod === 'app') {
                setSecret(data.secret);
                setQrCodeUrl(data.qrCodeUrl);
                setBackupCodes(data.backupCodes);
                setStep('setup');
            } else {
                setStep('verify');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/security/mfa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    code: verificationCode,
                    secret: method === 'app' ? secret : undefined,
                    backupCodes: method === 'app' ? backupCodes : undefined
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            if (method === 'app') {
                setStep('backup');
            } else {
                onComplete();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyBackupCodes = () => {
        const codesText = backupCodes.join('\n');
        navigator.clipboard.writeText(codesText);
        setCopiedCodes(true);
        setTimeout(() => setCopiedCodes(false), 2000);
    };

    const renderMethodSelection = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">Choose MFA Method</h3>

            <button
                onClick={() => handleMethodSelect('app')}
                disabled={loading}
                className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border-2 border-gray-700 hover:border-blue-500 transition-all text-left"
            >
                <div className="flex items-start gap-3">
                    <Smartphone className="w-6 h-6 text-blue-400 mt-1" />
                    <div>
                        <h4 className="text-white font-semibold mb-1">Authenticator App</h4>
                        <p className="text-gray-400 text-sm">
                            Use an app like Google Authenticator or Authy to generate codes
                        </p>
                    </div>
                </div>
            </button>

            <button
                onClick={() => handleMethodSelect('email')}
                disabled={loading}
                className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border-2 border-gray-700 hover:border-blue-500 transition-all text-left"
            >
                <div className="flex items-start gap-3">
                    <Mail className="w-6 h-6 text-green-400 mt-1" />
                    <div>
                        <h4 className="text-white font-semibold mb-1">Email Verification</h4>
                        <p className="text-gray-400 text-sm">
                            Receive verification codes via email
                        </p>
                    </div>
                </div>
            </button>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}
        </div>
    );

    const renderAppSetup = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">Scan QR Code</h3>

            <div className="bg-gray-800 p-6 rounded-lg text-center">
                {qrCodeUrl && (
                    <img src={qrCodeUrl} alt="QR Code" className="mx-auto mb-4" />
                )}

                <p className="text-gray-400 text-sm mb-2">
                    Scan this QR code with your authenticator app
                </p>

                <div className="mt-4 p-3 bg-gray-900 rounded border border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Manual Entry Key:</p>
                    <p className="text-white font-mono text-sm break-all">{secret}</p>
                </div>
            </div>

            <button
                onClick={() => setStep('verify')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
                Continue to Verification
            </button>
        </div>
    );

    const renderVerification = () => (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">Enter Verification Code</h3>

            <div className="bg-gray-800 p-6 rounded-lg">
                <p className="text-gray-400 text-sm mb-4">
                    {method === 'app'
                        ? 'Enter the 6-digit code from your authenticator app'
                        : 'Enter the 6-digit code sent to your email'}
                </p>

                <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-blue-500"
                    maxLength={6}
                />
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}

            <div className="flex gap-3">
                <button
                    onClick={() => setStep(method === 'app' ? 'setup' : 'method')}
                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={handleVerify}
                    disabled={loading || verificationCode.length !== 6}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Verifying...' : 'Verify'}
                </button>
            </div>
        </div>
    );

    const renderBackupCodes = () => (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-yellow-400" />
                <h3 className="text-xl font-semibold text-white">Save Backup Codes</h3>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4">
                <p className="text-yellow-400 text-sm">
                    <strong>Important:</strong> Save these backup codes in a secure location.
                    You can use them to access your account if you lose your authenticator device.
                </p>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {backupCodes.map((code, index) => (
                        <div key={index} className="p-2 bg-gray-900 rounded text-center">
                            <span className="text-white font-mono text-sm">{code}</span>
                        </div>
                    ))}
                </div>

                <button
                    onClick={copyBackupCodes}
                    className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                    {copiedCodes ? (
                        <>
                            <Check className="w-4 h-4" />
                            Copied!
                        </>
                    ) : (
                        <>
                            <Copy className="w-4 h-4" />
                            Copy All Codes
                        </>
                    )}
                </button>
            </div>

            <button
                onClick={onComplete}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
                Complete Setup
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl max-w-md w-full p-6 relative">
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Enable Two-Factor Authentication</h2>
                    <p className="text-gray-400 text-sm">
                        Add an extra layer of security to your account
                    </p>
                </div>

                {step === 'method' && renderMethodSelection()}
                {step === 'setup' && renderAppSetup()}
                {step === 'verify' && renderVerification()}
                {step === 'backup' && renderBackupCodes()}
            </div>
        </div>
    );
};
