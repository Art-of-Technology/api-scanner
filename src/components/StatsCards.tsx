import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Activity, FolderOpen, Tag, Calendar } from 'lucide-react';
import { StatsCardsProps } from './types';

export function StatsCards({ 
  totalEndpoints, 
  totalCategories, 
  version, 
  generatedAt 
}: StatsCardsProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Today';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Today';
    }
  };

  const stats = [
    {
      icon: Activity,
      label: 'Total Endpoints',
      value: totalEndpoints,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30'
    },
    {
      icon: FolderOpen,
      label: 'Categories',
      value: totalCategories,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/30'
    },
    {
      icon: Tag,
      label: 'Version',
      value: version ? `v${version}` : 'v1.0.0',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30'
    },
    {
      icon: Calendar,
      label: 'Generated',
      value: formatDate(generatedAt),
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="transition-all hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <div className="flex items-center gap-2">
                    {typeof stat.value === 'number' ? (
                      <p className="text-2xl font-bold">{stat.value}</p>
                    ) : (
                      <Badge variant="outline" className="text-sm font-medium">
                        {stat.value}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
