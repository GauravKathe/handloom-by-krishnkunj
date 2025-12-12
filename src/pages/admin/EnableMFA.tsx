import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Shield, CheckCircle2, Copy } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function EnableMFA() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"init" | "verify" | "done">("init");
    const [factorId, setFactorId] = useState("");
    const [qrCode, setQrCode] = useState(""); // SVG data URI or simple secret
    const [secret, setSecret] = useState("");
    const [verificationCode, setVerificationCode] = useState("");

    useEffect(() => {
        checkMFAStatus();
    }, []);

    const checkMFAStatus = async () => {
        try {
            const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (error) throw error;

            if (data.currentLevel === "aal2") {
                setStep("done");
            }
        } catch (error) {
            console.error("Error checking MFA:", error);
        }
    };

    const startEnrollment = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: "totp",
            });

            if (error) throw error;

            setFactorId(data.id);
            setSecret(data.totp.secret);
            setQrCode(data.totp.qr_code); // Supabase returns a QR code SVG
            setStep("verify");
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const verifyAndEnable = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.mfa.challengeAndVerify({
                factorId,
                code: verificationCode,
            });

            if (error) throw error;

            toast({
                title: "MFA Enabled",
                description: "Your account is now secured with two-factor authentication.",
            });
            setStep("done");
        } catch (error: any) {
            toast({
                title: "Verification Failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const copySecret = () => {
        navigator.clipboard.writeText(secret);
        toast({ title: "Secret copied to clipboard" });
    };

    return (
        <div className="container max-w-lg mx-auto py-10">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-6 w-6 text-primary" />
                        <CardTitle>Two-Factor Authentication</CardTitle>
                    </div>
                    <CardDescription>
                        Secure your admin account with TOTP (Authenticator App)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === "init" && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Protect your account by requiring a code from an authenticator app (like Google Authenticator or Authy) when you log in.
                            </p>
                            <Button onClick={startEnrollment} disabled={loading} className="w-full">
                                {loading ? "Initializing..." : "Enable MFA"}
                            </Button>
                        </div>
                    )}

                    {step === "verify" && (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center p-4 border rounded-lg bg-white">
                                {/* Supabase returns qr_code as SVG string */}
                                <img
                                    src={qrCode}
                                    alt="Scan this QR code"
                                    className="w-48 h-48"
                                />
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium text-center">Or enter this secret key manually:</p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 p-2 bg-secondary rounded text-xs break-all">{secret}</code>
                                    <Button variant="ghost" size="icon" onClick={copySecret}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-medium">Verify Code</p>
                                <div className="flex justify-center">
                                    <InputOTP
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={setVerificationCode}
                                    >
                                        <InputOTPGroup>
                                            <InputOTPSlot index={0} />
                                            <InputOTPSlot index={1} />
                                            <InputOTPSlot index={2} />
                                            <InputOTPSlot index={3} />
                                            <InputOTPSlot index={4} />
                                            <InputOTPSlot index={5} />
                                        </InputOTPGroup>
                                    </InputOTP>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setStep("init")}>Cancel</Button>
                                <Button className="flex-1" onClick={verifyAndEnable} disabled={loading || verificationCode.length !== 6}>
                                    {loading ? "Verifying..." : "Verify & Enable"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === "done" && (
                        <div className="text-center space-y-4 py-4">
                            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                            <h3 className="text-xl font-semibold">MFA is Enabled</h3>
                            <p className="text-muted-foreground">
                                Your account is secure. You will need to enter a code from your authenticator app next time you log in.
                            </p>
                            <Button variant="outline" className="w-full" disabled>
                                MFA Active
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}