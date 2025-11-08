"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  MessageSquare,
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
  Download,
  Activity,
} from "lucide-react";

interface AnalyticsData {
  overview: {
    totalCampaigns: number;
    totalMessages: number;
    totalCustomers: number;
    successRate: number;
    activeCampaigns: number;
  };
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    createdAt: string;
    successRate: number;
  }>;
  stateAnalytics: Array<{
    state: string;
    customers: number;
    campaigns: number;
    messages: number;
    successRate: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    campaigns: number;
    messages: number;
    successRate: number;
  }>;
  messageStatusData: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const statusConfig = {
  draft: { label: "Draft", color: "#8884D8" },
  scheduled: { label: "Scheduled", color: "#0088FE" },
  sending: { label: "Sending", color: "#FFBB28" },
  sent: { label: "Sent", color: "#00C49F" },
  failed: { label: "Failed", color: "#FF8042" },
};

const messageStatusConfig = {
  pending: { label: "Pending", color: "#FFA500" },
  sent: { label: "Sent", color: "#0088FE" },
  delivered: { label: "Delivered", color: "#00C49F" },
  failed: { label: "Failed", color: "#FF8042" },
  undelivered: { label: "Undelivered", color: "#8884D8" },
};

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  // Load analytics data
  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");

      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  // Export analytics data
  const handleExportData = async () => {
    if (!analyticsData) return;

    try {
      const response = await fetch(`/api/analytics/export?timeRange=${timeRange}`);
      if (!response.ok) throw new Error("Failed to export analytics");

      const data = await response.json();

      // Create CSV content for campaigns
      const campaignHeaders = ["name", "status", "total_recipients", "sent_count", "delivered_count", "failed_count", "success_rate", "created_at"];
      const campaignCSV = [
        campaignHeaders.join(","),
        ...analyticsData.campaigns.map(campaign =>
          [
            `"${campaign.name}"`,
            `"${campaign.status}"`,
            campaign.totalRecipients,
            campaign.sentCount,
            campaign.deliveredCount,
            campaign.failedCount,
            campaign.successRate,
            `"${campaign.createdAt}"`,
          ].join(",")
        ),
      ].join("\n");

      // Download file
      const blob = new Blob([campaignCSV], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Analytics data exported successfully");
    } catch (error) {
      console.error("Error exporting analytics:", error);
      toast.error("Failed to export analytics data");
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="text-center py-8">Loading analytics...</div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="text-center py-8">No analytics data available</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.totalCampaigns}</div>
            <div className="text-xs text-muted-foreground">
              {analyticsData.overview.activeCampaigns} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.totalMessages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.overview.totalCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analyticsData.overview.successRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Messages</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analyticsData.overview.totalMessages - Math.round((analyticsData.overview.successRate / 100) * analyticsData.overview.totalMessages)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="states">States</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Message Status Distribution</CardTitle>
                <CardDescription>
                  Breakdown of message delivery status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.messageStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analyticsData.messageStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={messageStatusConfig[entry.status as keyof typeof messageStatusConfig]?.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Performance</CardTitle>
                <CardDescription>
                  Campaign success rates over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.timeSeriesData.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="successRate"
                      stroke="#00C49F"
                      strokeWidth={2}
                      name="Success Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>
                Success rates and delivery metrics for all campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.campaigns.slice(-10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="deliveredCount" fill="#00C49F" name="Delivered" />
                  <Bar dataKey="failedCount" fill="#FF8042" name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.campaigns.slice(0, 10).map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(campaign.createdAt)} • {campaign.totalRecipients} recipients
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={campaign.status === "sent" ? "default" : campaign.status === "failed" ? "destructive" : "secondary"}>
                        {statusConfig[campaign.status as keyof typeof statusConfig]?.label || campaign.status}
                      </Badge>
                      <div className="text-sm font-medium">
                        {campaign.successRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="states" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>State-wise Performance</CardTitle>
              <CardDescription>
                Campaign metrics broken down by customer states
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.stateAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="state" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="customers" fill="#0088FE" name="Customers" />
                  <Bar dataKey="messages" fill="#00C49F" name="Messages Sent" />
                  <Bar dataKey="campaigns" fill="#FFBB28" name="Campaigns" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>State Success Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.stateAnalytics.map((state) => (
                  <div key={state.state} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{state.state}</span>
                      <span className="text-sm text-muted-foreground">
                        {state.successRate.toFixed(1)}% success rate
                      </span>
                    </div>
                    <Progress value={state.successRate} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {state.customers} customers • {state.messages} messages • {state.campaigns} campaigns
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Trends</CardTitle>
              <CardDescription>
                Campaign and message volume over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analyticsData.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="campaigns" fill="#0088FE" name="Campaigns" />
                  <Line yAxisId="right" type="monotone" dataKey="messages" stroke="#00C49F" strokeWidth={2} name="Messages" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}