"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Users,
  MessageSquare,
  Calendar,
  Eye,
} from "lucide-react";
import { Customer } from "@/db/schema/sms";
import { useRouter } from "next/navigation";

const steps = [
  { id: 1, title: "Campaign Details", icon: MessageSquare },
  { id: 2, title: "Recipients", icon: Users },
  { id: 3, title: "Message", icon: MessageSquare },
  { id: 4, title: "Schedule", icon: Calendar },
  { id: 5, title: "Review", icon: Eye },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Form data
  const [campaignData, setCampaignData] = useState({
    name: "",
    message: "",
    targetState: "",
    customerIds: [] as string[],
    scheduleTime: "",
    sendImmediately: true,
  });

  // Load customers for recipient selection
  const loadCustomers = async () => {
    try {
      const response = await fetch("/api/customers?limit=1000");
      if (!response.ok) throw new Error("Failed to fetch customers");

      const data = await response.json();
      setCustomers(data.customers);
    } catch (error) {
      console.error("Error loading customers:", error);
      toast.error("Failed to load customers");
    }
  };

  useEffect(() => {
    if (currentStep === 2) {
      loadCustomers();
    }
  }, [currentStep]);

  // Step validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return campaignData.name.trim() !== "";
      case 2:
        return campaignData.targetState !== "" || campaignData.customerIds.length > 0;
      case 3:
        return campaignData.message.trim() !== "" && campaignData.message.length <= 1600;
      case 4:
        return campaignData.sendImmediately || campaignData.scheduleTime !== "";
      default:
        return true;
    }
  };

  // Navigation
  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      toast.error("Please complete all required fields");
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle customer selection
  const handleCustomerToggle = (customerId: string, checked: boolean) => {
    if (checked) {
      setCampaignData({
        ...campaignData,
        customerIds: [...campaignData.customerIds, customerId],
      });
    } else {
      setCampaignData({
        ...campaignData,
        customerIds: campaignData.customerIds.filter(id => id !== customerId),
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setCampaignData({
        ...campaignData,
        customerIds: customers.map(c => c.id),
      });
    } else {
      setCampaignData({
        ...campaignData,
        customerIds: [],
      });
    }
  };

  // State-based selection
  const handleStateSelection = (state: string) => {
    const stateCustomers = customers.filter(c => c.state === state);
    const newStateCustomerIds = stateCustomers.map(c => c.id);

    setCampaignData({
      ...campaignData,
      targetState: state,
      customerIds: newStateCustomerIds,
    });
  };

  // Create campaign
  const createCampaign = async () => {
    try {
      setLoading(true);

      const payload = {
        name: campaignData.name,
        message: campaignData.message,
        customerIds: campaignData.customerIds,
        ...(campaignData.targetState && { targetState: campaignData.targetState }),
        ...(campaignData.scheduleTime && !campaignData.sendImmediately && {
          scheduleTime: campaignData.scheduleTime
        }),
      };

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create campaign");
      }

      const campaign = await response.json();
      toast.success("Campaign created successfully!");
      router.push(`/dashboard/campaigns/${campaign.id}`);
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  // Get unique states
  const uniqueStates = Array.from(new Set(customers.map(c => c.state)));

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                value={campaignData.name}
                onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                placeholder="e.g., Summer Sale Promotion"
                className="mt-1"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label>Recipient Selection Method</Label>
              <div className="mt-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Target by State</CardTitle>
                    <CardDescription>
                      Send to all customers in a specific state
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={campaignData.targetState}
                      onValueChange={handleStateSelection}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a state" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueStates.map(state => (
                          <SelectItem key={state} value={state}>
                            {state} ({customers.filter(c => c.state === state).length} customers)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Individual Selection</CardTitle>
                    <CardDescription>
                      Select specific customers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <div className="flex items-center space-x-2 p-2 border rounded">
                        <Checkbox
                          id="selectAll"
                          checked={selectAll}
                          onCheckedChange={handleSelectAll}
                        />
                        <Label htmlFor="selectAll" className="flex-1">
                          Select All ({customers.length} customers)
                        </Label>
                      </div>
                      {customers.map(customer => (
                        <div key={customer.id} className="flex items-center space-x-2 p-2 border rounded">
                          <Checkbox
                            id={customer.id}
                            checked={campaignData.customerIds.includes(customer.id)}
                            onCheckedChange={(checked) =>
                              handleCustomerToggle(customer.id, checked as boolean)
                            }
                          />
                          <Label htmlFor={customer.id} className="flex-1">
                            <div>{customer.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {customer.phone} • {customer.state}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="message">Message Content *</Label>
              <Textarea
                id="message"
                value={campaignData.message}
                onChange={(e) => setCampaignData({ ...campaignData, message: e.target.value })}
                placeholder="Enter your SMS message here..."
                rows={6}
                className="mt-1"
              />
              <div className="mt-1 text-sm text-muted-foreground">
                {campaignData.message.length}/1600 characters
                {campaignData.message.length > 160 && (
                  <span className="text-orange-600 ml-2">
                    Warning: Messages over 160 characters may be split into multiple SMS
                  </span>
                )}
              </div>
            </div>
            {campaignData.message && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm">{campaignData.message}</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Character count: {campaignData.message.length}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sendImmediately"
                checked={campaignData.sendImmediately}
                onCheckedChange={(checked) =>
                  setCampaignData({ ...campaignData, sendImmediately: checked as boolean })
                }
              />
              <Label htmlFor="sendImmediately" className="text-base font-medium">
                Send Immediately
              </Label>
            </div>

            {!campaignData.sendImmediately && (
              <div>
                <Label htmlFor="scheduleTime">Schedule Time *</Label>
                <Input
                  id="scheduleTime"
                  type="datetime-local"
                  value={campaignData.scheduleTime}
                  onChange={(e) => setCampaignData({ ...campaignData, scheduleTime: e.target.value })}
                  min={new Date().toISOString().slice(0, 16)}
                  className="mt-1"
                />
              </div>
            )}

            {!campaignData.sendImmediately && campaignData.scheduleTime && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Campaign will be sent on {new Date(campaignData.scheduleTime).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 5:
        const recipientCount = campaignData.targetState
          ? customers.filter(c => c.state === campaignData.targetState).length
          : campaignData.customerIds.length;

        return (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Campaign Name</Label>
                  <div className="mt-1">{campaignData.name}</div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Recipients</Label>
                  <div className="mt-1">
                    {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
                    {campaignData.targetState && (
                      <Badge variant="secondary" className="ml-2">
                        {campaignData.targetState}
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Message</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
                    {campaignData.message}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {campaignData.message.length} characters
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Schedule</Label>
                  <div className="mt-1">
                    {campaignData.sendImmediately ? (
                      <div className="flex items-center space-x-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span>Send Immediately</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(campaignData.scheduleTime).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Create Campaign</h2>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center space-x-2">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    isCompleted
                      ? "bg-primary text-primary-foreground border-primary"
                      : isCurrent
                      ? "border-primary text-primary"
                      : "border-muted-foreground text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <StepIcon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-4 ${
                    isCompleted ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].title}</CardTitle>
          <CardDescription>
            {currentStep === 1 && "Enter the basic details for your campaign"}
            {currentStep === 2 && "Choose who will receive your message"}
            {currentStep === 3 && "Compose your SMS message"}
            {currentStep === 4 && "Set when to send your campaign"}
            {currentStep === 5 && "Review your campaign before creating"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStepContent()}

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {currentStep === steps.length ? (
              <Button onClick={createCampaign} disabled={loading}>
                {loading ? "Creating..." : "Create Campaign"}
                <Check className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={nextStep}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}