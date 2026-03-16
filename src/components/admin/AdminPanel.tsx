"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Users,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  MapPin,
  Eye,
  ArrowLeft,
  Crown,
  Mail,
  Calendar,
  Trash2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Property } from "@/types"

interface UserWithCount {
  id: string
  email: string
  name: string | null
  role: string
  phone: string | null
  subscriptionPlan: string
  premiumExpiry: string | null
  propertiesViewed: number
  createdAt: string
  _count: {
    properties: number
    bids: number
  }
}

interface AdminPanelProps {
  userId: string
  onBack: () => void
}

export function AdminPanel({ userId, onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProperties: 0,
    pendingProperties: 0,
    totalBids: 0,
    totalValue: 0,
  })
  const [pendingProperties, setPendingProperties] = useState<Property[]>([])
  const [users, setUsers] = useState<UserWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserWithCount | null>(null)
  const [premiumDuration, setPremiumDuration] = useState("30")
  const [allProperties, setAllProperties] = useState<Property[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    setLoading(true)
    try {
      // Fetch all properties including unverified for admin
      const propsResponse = await fetch("/api/properties?includeUnverified=true")
      if (propsResponse.ok) {
        const properties = await propsResponse.json()
        setAllProperties(properties)
        const pending = properties.filter((p: Property) => !p.isVerified)
        setPendingProperties(pending)
        setStats((prev) => ({
          ...prev,
          totalProperties: properties.length,
          pendingProperties: pending.length,
          totalValue: properties.reduce((sum: number, p: Property) => sum + p.totalPrice, 0),
        }))
      }
      
      // Fetch users for stats
      const usersResponse = await fetch("/api/users")
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData)
        setStats((prev) => ({
          ...prev,
          totalUsers: usersData.length,
        }))
      }
    } catch (error) {
      console.error("Failed to fetch admin data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgradeUser = async (targetUserId: string, role: string, durationDays: number) => {
    try {
      const premiumExpiry = new Date()
      premiumExpiry.setDate(premiumExpiry.getDate() + durationDays)
      
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          role: role,
          premiumExpiry: premiumExpiry.toISOString(),
        }),
      })

      if (response.ok) {
        toast({
          title: "User Updated",
          description: `User has been upgraded to ${role}`,
        })
        fetchAdminData()
        setSelectedUser(null)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
    }
  }

  const handleVerifyProperty = async (propertyId: string, verify: boolean) => {
    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isVerified: verify,
          verifiedBy: userId,
          verifiedAt: new Date().toISOString(),
          status: verify ? "AVAILABLE" : "PENDING",
        }),
      })

      if (response.ok) {
        toast({
          title: verify ? "Property Verified" : "Property Rejected",
          description: verify
            ? "The property is now visible on the map"
            : "The property has been rejected",
        })
        fetchAdminData()
        setSelectedProperty(null)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive",
      })
    }
  }

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm("Are you sure you want to delete this property? This action cannot be undone.")) return
    
    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Property Deleted",
          description: "The property has been permanently removed",
        })
        fetchAdminData()
        setSelectedProperty(null)
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to delete property",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-semibold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage properties and users</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pending">
                Pending
                {pendingProperties.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {pendingProperties.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="bids">Bids</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-4">
            <TabsContent value="overview" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Properties</span>
                    </div>
                    <div className="text-2xl font-bold mt-1">{stats.totalProperties}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-500" />
                      <span className="text-sm text-muted-foreground">Pending</span>
                    </div>
                    <div className="text-2xl font-bold mt-1">{stats.pendingProperties}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Users</span>
                    </div>
                    <div className="text-2xl font-bold mt-1">{stats.totalUsers}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-muted-foreground">Total Value</span>
                    </div>
                    <div className="text-2xl font-bold mt-1">
                      ${(stats.totalValue / 1000000).toFixed(1)}M
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    No recent activity to display
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending" className="space-y-4 mt-0">
              {pendingProperties.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium">All caught up!</p>
                    <p className="text-muted-foreground">No pending properties to review</p>
                  </CardContent>
                </Card>
              ) : (
                pendingProperties.map((property) => (
                  <Card key={property.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">{property.title}</div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {property.city}, {property.state}
                          </div>
                          <div className="text-lg font-bold text-primary">
                            ${property.totalPrice.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedProperty(property)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="properties" className="space-y-4 mt-0">
              {allProperties.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium">No properties found</p>
                  </CardContent>
                </Card>
              ) : (
                allProperties.map((property) => (
                  <Card key={property.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{property.title}</span>
                            {property.isVerified ? (
                              <Badge className="bg-green-500 text-white text-xs">Verified</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Pending</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">{property.status}</Badge>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {property.city}, {property.state}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-bold text-primary">${property.totalPrice.toLocaleString()}</span>
                            <span className="text-muted-foreground">{property.areaSqm.toLocaleString()} m²</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedProperty(property)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteProperty(property.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-4 mt-0">
              {loading ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-4">Loading users...</p>
                  </CardContent>
                </Card>
              ) : users.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium">No users found</p>
                  </CardContent>
                </Card>
              ) : (
                users.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.name || "No Name"}</span>
                            {(user.role === "PREMIUM_USER" || user.role === "PREMIUM_VENDOR") && (
                              <Badge className="bg-amber-500 text-white">
                                <Crown className="h-3 w-3 mr-1" />
                                Premium
                              </Badge>
                            )}
                            <Badge variant="outline">{user.role}</Badge>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>{user._count.properties} properties</span>
                            <span>{user._count.bids} bids</span>
                            <span>{user.propertiesViewed} views</span>
                          </div>
                          {user.premiumExpiry && (
                            <div className="flex items-center gap-1 text-xs text-amber-600">
                              <Calendar className="h-3 w-3" />
                              Premium until: {new Date(user.premiumExpiry).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Crown className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="bids" className="space-y-4 mt-0">
              <Card>
                <CardContent className="p-8 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">Bid Management</p>
                  <p className="text-muted-foreground">
                    Monitor and manage property bids
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Property</DialogTitle>
            <DialogDescription>
              Verify or reject this property listing
            </DialogDescription>
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-4">
              <div>
                <Label>Property Title</Label>
                <div className="font-medium">{selectedProperty.title}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <div>{selectedProperty.type}</div>
                </div>
                <div>
                  <Label>Area</Label>
                  <div>{selectedProperty.areaSqm} m²</div>
                </div>
              </div>

              <div>
                <Label>Price</Label>
                <div className="text-2xl font-bold text-primary">
                  ${selectedProperty.totalPrice.toLocaleString()}
                </div>
              </div>

              <div>
                <Label>Location</Label>
                <div>{selectedProperty.address}</div>
                <div>{selectedProperty.city}, {selectedProperty.state}</div>
              </div>

              {selectedProperty.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedProperty.description}
                  </p>
                </div>
              )}

              <Separator />

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handleVerifyProperty(selectedProperty.id, true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verify
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleVerifyProperty(selectedProperty.id, false)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
              
              <div className="pt-2 border-t">
                <Button
                  variant="ghost"
                  className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDeleteProperty(selectedProperty.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Property Permanently
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Management Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Manage User
            </DialogTitle>
            <DialogDescription>
              Update user role and premium status
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="font-medium">{selectedUser.name || "No Name"}</div>
                <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{selectedUser.role}</Badge>
                  {selectedUser.subscriptionPlan === "PREMIUM" && (
                    <Badge className="bg-amber-500 text-white">Premium</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Premium Duration (days)</Label>
                  <Select 
                    value={premiumDuration}
                    onValueChange={setPremiumDuration}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => handleUpgradeUser(selectedUser.id, "PREMIUM_USER", parseInt(premiumDuration))}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Premium User
                  </Button>
                  <Button 
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => handleUpgradeUser(selectedUser.id, "PREMIUM_VENDOR", parseInt(premiumDuration))}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Premium Vendor
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleUpgradeUser(selectedUser.id, "USER", 0)}
                  >
                    Regular User
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleUpgradeUser(selectedUser.id, "VENDOR", 0)}
                  >
                    Vendor
                  </Button>
                </div>
              </div>

              <Separator />

              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => setSelectedUser(null)}
              >
                Cancel
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
