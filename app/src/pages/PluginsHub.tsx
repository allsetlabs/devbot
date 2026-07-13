import { useNavigate } from 'react-router-dom';
import { Baby, Leaf, Network, ArrowRight } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@allsetlabs/forge/components/ui/card';

interface PluginCard {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
}

const PLUGINS: PluginCard[] = [
  {
    title: 'Family Hierarchy',
    description:
      'Interactive family tree from a 1978 Tamil genealogy book — explore, edit, and verify 411 people across 10 generations.',
    path: '/plugins/family-hierarchy',
    icon: <Network className="h-6 w-6" />,
  },
  {
    title: 'Baby Logs',
    description: 'Track feedings, diapers, sleep, and growth measurements across one or more baby profiles.',
    path: '/plugins/baby-logs',
    icon: <Baby className="h-6 w-6" />,
  },
  {
    title: 'Lawn Care',
    description: 'Lawn profiles, AI-generated treatment plans, weather-aware guidance, and progress photos.',
    path: '/plugins/lawn-care',
    icon: <Leaf className="h-6 w-6" />,
  },
];

export function PluginsHub() {
  const navigate = useNavigate();
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto w-full max-w-4xl p-6">
        <p className="mb-6 text-sm text-muted-foreground">
          Self-contained DevBot modules. Open one to work in it.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PLUGINS.map((p) => (
            <Card
              key={p.path}
              onClick={() => navigate(p.path)}
              className="group cursor-pointer transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md"
            >
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {p.icon}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <CardTitle>{p.title}</CardTitle>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
