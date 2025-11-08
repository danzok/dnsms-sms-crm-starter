"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Users,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  BarChart3,
  Download,
} from "lucide-react";

interface CampaignDetail {
  id: string;
  name: string;
  message: string;
  targetState?: string;
  scheduleTime?: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  statistics: {
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    failed: number;
    undelivered: number;
  };
}

const statusConfig = {
  draft: {
    label: "Draft",
    color: "secondary",
    icon: MessageSquare,
  },
  scheduled: {
    label: "Scheduled",
    color: "default",
    icon: Clock,
  },
  sending: {
    label: "Sending",
    color: "default",
    icon: Send,
  },
  sent: {
    label: "Sent",
    color: "default",
    icon: CheckCircle,
  },
  failed: {
    label: "Failed",
    color: "destructive",
    icon: XCircle,
  },
};

const messageStatusConfig = {
  pending: {
    label: "Pending",
    color: "secondary",
    icon: Clock,
  },
  sent: {
    label: "Sent",
    color: "default",
    icon: Send,
  },
  delivered: {
    label: "Delivered",
    color: "default",
    icon: CheckCircle,
  },
  failed: {
    label: "Failed",
    color: "destructive",
    icon: XCircle,
  },
  undelivered: {
    label: "Undelivered",
    color: "destructive",
    icon: AlertCircle,
  },
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Load campaign details
  const loadCampaign = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/campaigns/${campaignId}`);
      if (!response.ok) throw new Error("Failed to fetch campaign");

      const data = await response.json();
      setCampaign(data);
    } catch (error) {
      console.error("Error loading campaign:", error);
      toast.error("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      loadCampaign();
    }
  }, [campaignId]);

  // Send campaign
  const handleSendCampaign = async () => {
    if (!campaign) return;

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send campaign");
      }

      const result = await response.json();
      toast.success(`Campaign sent to ${result.totalRecipients} recipients`);
      loadCampaign();
    } catch (error) {
      console.error("Error sending campaign:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send campaign");
    }
  };

  // Export campaign data
  const handleExportData = async () => {
    if (!campaign) return;

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/export`);
      if (!response.ok) throw new Error("Failed to export campaign data");

      const data = await response.json();

      // Create CSV content
      const headers = ["phone", "status", "sent_at", "delivered_at", "error_message"];
      const csvContent = [
        headers.join(","),
        ...data.messages.map((msg: any) =>
          [
            `"${msg.phone}"`,
            `"${msg.status}"`,
            `"${msg.sent_at || ""}"`,
            `"${msg.delivered_at || ""}"`,
            `"${msg.error_message || ""}"`,
          ].join(",")
        ),
      ].join("\n");

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campaign_${campaign.name}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Campaign data exported successfully");
    } catch (error) {
      console.error("Error exporting campaign data:", error);
      toast.error("Failed to export campaign data");
    }
  };

  // Calculate percentages
  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + " " + new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="text-center py-8">Loading campaign details...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="text-center py-8">Campaign not found</div>
      </div>
    );
  }

  const statusInfo = statusConfig[campaign.status as keyof typeof statusConfig];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">{campaign.name}</h2>
          <Badge variant={statusInfo.color as any}>
            <StatusIcon className="mr-1 h-3 w-3" />
            {statusInfo.label}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExportData}>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>

          {(campaign.status === "draft" || campaign.status === "scheduled") && (
            <Button onClick={handleSendCampaign} disabled={campaign.totalRecipients === 0}>
              <Send className="mr-2 h-4 w-4" />
              Send Now
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.totalRecipients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{campaign.deliveredCount}</div>
            <div className="text-xs text-muted-foreground">
              {calculatePercentage(campaign.deliveredCount, campaign.totalRecipients)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{campaign.failedCount}</div>
            <div className="text-xs text-muted-foreground">
              {calculatePercentage(campaign.failedCount, campaign.totalRecipients)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.totalRecipients > 0
                ? Math.round(((campaign.deliveredCount || 0) / campaign.totalRecipients) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="message">Message Content</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Created</div>
                  <div>{formatDate(campaign.createdAt)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
                  <div>{formatDate(campaign.updatedAt)}</div>
                </div>
                {campaign.scheduleTime && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Scheduled For</div>
                    <div>{formatDate(campaign.scheduleTime)}</div>
                  </div>
                )}
                {campaign.targetState && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Target State</div>
                    <Badge variant="secondary">{campaign.targetState}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(campaign.statistics).map(([status, count]) => {
                if (status === 'total' || count === 0) return null;

                const statusInfo = messageStatusConfig[status as keyof typeof messageStatusConfig];
                const StatusIcon = statusInfo.icon;
                const percentage = calculatePercentage(count, campaign.statistics.total);

                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <StatusIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">{statusInfo.label}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="message" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Content</CardTitle>
              <CardDescription>
                The message that was sent to all recipients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-lg">
                <div className="whitespace-pre-wrap">{campaign.message}</div>
                <div className="text-xs text-muted-foreground mt-4">
                  {campaign.message.length} characters
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(campaign.statistics).map(([status, count]) => {
                  if (status === 'total') return null;

                  const statusInfo = messageStatusConfig[status as keyof typeof messageStatusConfig];
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div key={status} className="text-center">
                      <StatusIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground">{statusInfo.label}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}