#include <stdio.h>
#include <stdlib.h>
#include <process.h>
#include <WinSock2.h>
#include <Windows.h>
#include <iostream>
#include <string>
#include <thread>

#include "../app/application.hpp"
#include "include/server.hpp"
#include "../app/lib/include/user.hpp"
#include "../app/apis/include/packet_handler_base.hpp"
#include "../app/apis/include/error.hpp"
#include "../server/include/packet.hpp"
#include "../server/include/socket.hpp"

namespace IocpGameServer {

	DWORD IOCPThreadMain(LPVOID iocp, std::shared_ptr<Application> app) {
		HANDLE hComPort = (HANDLE)iocp;
		DWORD bytesTrans;
		Socket* p_socket;
		Packet* packet;
		DWORD flags = 0;

		while (true) {
			GetQueuedCompletionStatus(hComPort, &bytesTrans, (PUINT_PTR)&p_socket, reinterpret_cast<LPOVERLAPPED*>(&packet), INFINITE);
			app->Console("IO Complete!");
			auto socket = p_socket->shared_from_this();

			if (socket != nullptr) {
				if (packet->GetRwMode() == Packet::kReadMode) {
					//Ŭ���̾�Ʈ�κ��� �޽����� ���� ��쿡 ���� ó��
					if (bytesTrans == 0) {
						//EOF ���� ��
						app->Console("EOF");
						if (socket->IsDisconnected()) {
							// �������� �̹� ������ ���� ����
						}
						else {
							// Ŭ�󿡼� ���� ���Ḧ ��û��
							socket->Disconnect();
						}
					}
					else {
						auto protocol = packet->GetProtocol();
						// Ŭ���̾�Ʈ�κ��� �޽����� �޾����Ƿ� no action Ÿ�̸Ӹ� �ʱ�ȭ
						socket->NotifyNoActionTimer();

						// ��Ŷ�� �ܽð��� �ʹ� ���� ������ Ŭ�� ���� ó��
						if (!CheckTooManyPackets(socket)) {
							socket->Disconnect();
						}
						else {
							if (protocol == 1) {
								// �α��� request
								app->Console("login request");
								auto success = User::CreateUser(socket, packet->GetPacketData());
								if (success) {
									app->Console("login success");
									//socket->Send(1);
								}
								else {
									socket->Send(Error::kProtocol, "login failed");
								}
							}

							if (socket->GetUser() == nullptr) {
								socket->Send(Error::kProtocol, "login first");
								socket->Disconnect();
							}
							else {
								app->GetPacketHandler(protocol).handle(socket->GetUser(), packet->GetPacketData());
								socket->Receive();
							}
						}
					}
				}
				else {

				}
			}
			delete packet;
		}
		return 0;
	}

	const bool CheckTooManyPackets(std::shared_ptr<Socket> socket) {

		const auto packet_count = socket->IncrementPacketCount();
		
		if (packet_count > kWarningPacketCount) {
			if (packet_count > kMaximumPacketCount) { //force disconnect
				return false;
			}
			else {//send as warning
				socket->Send(Error::kProtocol, "too many request");
			}
		}

		return true;
	}
} //namespace IocpGameServer