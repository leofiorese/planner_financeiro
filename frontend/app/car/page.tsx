"use client";

import { useState } from "react";
import { Plus, RefreshCw, TriangleAlert } from "lucide-react";
import { CarExpensesTab } from "@/components/car/CarExpensesTab";
import { CarStats } from "@/components/car/CarStats";
import { FuelLogFormModal } from "@/components/car/FuelLogFormModal";
import { FuelTab } from "@/components/car/FuelTab";
import { MaintenanceAlerts } from "@/components/car/MaintenanceAlerts";
import { MaintenanceFormModal } from "@/components/car/MaintenanceFormModal";
import { MaintenanceTab } from "@/components/car/MaintenanceTab";
import { OverviewTab } from "@/components/car/OverviewTab";
import { VehicleFormModal } from "@/components/car/VehicleFormModal";
import { VehicleSwitcher } from "@/components/car/VehicleSwitcher";
import type {
  FuelFormValues,
  FuelLog,
  MaintenanceFormValues,
  MaintenanceLog,
  Vehicle,
  VehicleFormValues,
} from "@/components/car/car-types";
import { useCarData } from "@/components/car/hooks/useCarData";
import { useCarStats } from "@/components/car/hooks/useCarStats";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withToast } from "@/lib/toast";

type CarTab = "overview" | "fuel" | "maintenance" | "expenses";

export default function CarPage() {
  const car = useCarData();
  const confirm = useConfirm();
  const stats = useCarStats(car.selectedVehicle, car.vehicleFuelLogs, car.vehicleMaintenanceLogs);

  const [activeTab, setActiveTab] = useState<CarTab>("overview");
  const [vehicleModal, setVehicleModal] = useState<{ open: boolean; vehicle: Vehicle | null }>({
    open: false,
    vehicle: null,
  });
  const [fuelModal, setFuelModal] = useState<{ open: boolean; log: FuelLog | null }>({ open: false, log: null });
  const [maintenanceModal, setMaintenanceModal] = useState<{ open: boolean; log: MaintenanceLog | null }>({
    open: false,
    log: null,
  });

  const openCreateVehicle = () => setVehicleModal({ open: true, vehicle: null });

  const saveVehicle = (values: VehicleFormValues) =>
    withToast(car.save("vehicle", vehicleModal.vehicle ? { ...values, id: vehicleModal.vehicle.id } : values), {
      success: vehicleModal.vehicle ? "Veículo atualizado" : "Veículo cadastrado",
      error: "Não foi possível salvar o veículo",
    });

  const saveFuel = (values: FuelFormValues) =>
    withToast(car.save("fuelLog", fuelModal.log ? { ...values, id: fuelModal.log.id } : values), {
      success: fuelModal.log ? "Abastecimento atualizado" : "Abastecimento registrado",
      error: "Não foi possível salvar o abastecimento",
    });

  const saveMaintenance = (values: MaintenanceFormValues) =>
    withToast(
      car.save("maintenanceLog", maintenanceModal.log ? { ...values, id: maintenanceModal.log.id } : values),
      {
        success: maintenanceModal.log ? "Manutenção atualizada" : "Manutenção registrada",
        error: "Não foi possível salvar a manutenção",
      },
    );

  const deleteEntity = async (
    type: "vehicle" | "fuelLog" | "maintenanceLog",
    id: string,
    title: string,
    successMessage: string,
  ) => {
    const ok = await confirm({ title, confirmText: "Excluir", tone: "danger" });
    if (!ok) return;
    try {
      await withToast(car.remove(type, id), {
        success: successMessage,
        error: "Não foi possível excluir o registro",
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (car.loading) return <PageSkeleton stats={5} rows={3} />;

  if (car.error && car.vehicles.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Meu carro" description="Abastecimentos, manutenções e custo por km" />
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-8 text-center">
          <TriangleAlert className="size-6 text-destructive" aria-hidden />
          <p className="text-sm font-medium">{car.error}</p>
          <Button variant="outline" onClick={car.retry}>
            <RefreshCw aria-hidden />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const { selectedVehicle, vehicleFuelLogs, vehicleMaintenanceLogs } = car;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Meu carro"
        description="Telemetria de abastecimentos, manutenções preventivas e controle de custo por km"
        actions={
          <>
            {selectedVehicle && (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {selectedVehicle.licensePlate || `${selectedVehicle.brand} ${selectedVehicle.model}`}
              </span>
            )}
            <VehicleSwitcher
              vehicles={car.vehicles}
              selectedId={car.selectedVehicleId}
              onSelect={car.setSelectedVehicleId}
            />
            <Button onClick={openCreateVehicle}>
              <Plus aria-hidden />
              Adicionar veículo
            </Button>
          </>
        }
      />

      <MaintenanceAlerts alerts={stats.upcomingMaintenance} />

      {selectedVehicle && (
        <CarStats
          vehicle={selectedVehicle}
          fuelLogs={vehicleFuelLogs}
          maintenanceLogs={vehicleMaintenanceLogs}
          stats={stats}
        />
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CarTab)} className="gap-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="fuel">Abastecimentos ({vehicleFuelLogs.length})</TabsTrigger>
          <TabsTrigger value="maintenance">Manutenções ({vehicleMaintenanceLogs.length})</TabsTrigger>
          <TabsTrigger value="expenses">Despesas de transporte ({stats.transportExpenses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            vehicle={selectedVehicle}
            vehicleCount={car.vehicles.length}
            stats={stats}
            onCreateVehicle={openCreateVehicle}
            onEditVehicle={(vehicle) => setVehicleModal({ open: true, vehicle })}
            onDeleteVehicle={(vehicle) =>
              deleteEntity("vehicle", vehicle.id, `Excluir o veículo "${vehicle.name}"?`, "Veículo excluído")
            }
          />
        </TabsContent>

        <TabsContent value="fuel">
          <FuelTab
            logs={vehicleFuelLogs}
            canCreate={Boolean(car.selectedVehicleId)}
            onCreate={() => setFuelModal({ open: true, log: null })}
            onEdit={(log) => setFuelModal({ open: true, log })}
            onDelete={(log) =>
              deleteEntity("fuelLog", log.id, "Excluir este abastecimento?", "Abastecimento excluído")
            }
          />
        </TabsContent>

        <TabsContent value="maintenance">
          <MaintenanceTab
            logs={vehicleMaintenanceLogs}
            canCreate={Boolean(car.selectedVehicleId)}
            onCreate={() => setMaintenanceModal({ open: true, log: null })}
            onEdit={(log) => setMaintenanceModal({ open: true, log })}
            onDelete={(log) =>
              deleteEntity("maintenanceLog", log.id, "Excluir esta manutenção?", "Manutenção excluída")
            }
          />
        </TabsContent>

        <TabsContent value="expenses">
          <CarExpensesTab stats={stats} />
        </TabsContent>
      </Tabs>

      <VehicleFormModal
        open={vehicleModal.open}
        onOpenChange={(open) => setVehicleModal((prev) => ({ ...prev, open }))}
        vehicle={vehicleModal.vehicle}
        onSubmit={saveVehicle}
      />
      <FuelLogFormModal
        open={fuelModal.open}
        onOpenChange={(open) => setFuelModal((prev) => ({ ...prev, open }))}
        vehicleId={car.selectedVehicleId}
        log={fuelModal.log}
        onSubmit={saveFuel}
      />
      <MaintenanceFormModal
        open={maintenanceModal.open}
        onOpenChange={(open) => setMaintenanceModal((prev) => ({ ...prev, open }))}
        vehicleId={car.selectedVehicleId}
        log={maintenanceModal.log}
        onSubmit={saveMaintenance}
      />
    </div>
  );
}
