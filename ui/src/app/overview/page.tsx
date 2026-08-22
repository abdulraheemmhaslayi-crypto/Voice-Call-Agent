"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

export default function OverviewPage() {
    const { user, provider } = useAuth();
    const isOSSMode = provider !== "stack";

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
                {/* Welcome Card */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="text-3xl">
                            {isOSSMode
                                ? "Welcome to 3D POWER"
                                : `Welcome${
                                      user?.displayName
                                          ? `, ${user.displayName.split(" ")[0]}`
                                          : ""
                                  }!`}
                        </CardTitle>
                        <CardDescription className="text-lg mt-2">
                            Build and manage your AI voice workflows.
                        </CardDescription>
                    </CardHeader>
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Voice Agents</CardTitle>
                            <CardDescription>
                                Create and manage your AI voice agents.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button>Manage Agents</Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Model Configuration</CardTitle>
                            <CardDescription>
                                Configure LLM, TTS and STT providers.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline">
                                Configure Models
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}